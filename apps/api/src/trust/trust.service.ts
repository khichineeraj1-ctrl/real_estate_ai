import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DealerKind, DealerStatus, DocumentKind, Prisma, ReportReason, ReportStatus } from '@prisma/client';
import { SessionUser, isStaff } from '../admin/auth';
import { Input } from '../admin/input';
import { Mailer, SITE_URL } from '../mail/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { Confidence, DealerFacts, Level, dealerConfidence, propertyConfidence } from './confidence';
import { MAX_DOCUMENTS, MAX_DOCUMENT_BYTES, RETENTION_DAYS, deleteDocument, readDocument, saveDocument, sniffDocument } from './documents';

const OLD_LEAD_MS = 2 * 86_400_000;
/** What we need on a listing to judge it. */
const FOR_CONFIDENCE = {
  id: true, priceInr: true, areaSqft: true, status: true, staffVerified: true, localityId: true, ownerId: true,
  owner: { select: { role: true } }, project: { select: { reraId: true } }, _count: { select: { photos: true } },
} satisfies Prisma.PropertySelect;
type ForConfidence = Prisma.PropertyGetPayload<{ select: typeof FOR_CONFIDENCE }>;

@Injectable()
export class TrustService {
  private log = new Logger('Trust');
  constructor(private readonly db: PrismaService, private readonly mail: Mailer) {}

  // ---- Working out confidence

  private async dealerFacts(userId: string): Promise<DealerFacts | null> {
    const profile = await this.db.dealerProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    const old = { property: { ownerId: userId }, createdAt: { lt: new Date(Date.now() - OLD_LEAD_MS) } };
    const upheld = await this.db.report.count({ where: { sellerId: userId, status: 'UPHELD' } });
    const [oldLeads, followedUp, listings, rejected] = await Promise.all([
      this.db.enquiry.count({ where: old }), this.db.enquiry.count({ where: { ...old, partnerStatus: { not: 'NEW' } } }),
      this.db.property.count({ where: { ownerId: userId } }), this.db.property.count({ where: { ownerId: userId, state: 'REJECTED' } }),
    ]);
    return {
      kind: profile.kind, approved: profile.status === 'APPROVED', checkIdentity: profile.checkIdentity, checkRera: profile.checkRera, checkPhone: profile.checkPhone,
      // Complaints: buyers' reports that staff upheld, plus any staff recorded by hand.
      checkAddress: profile.checkAddress, complaints: profile.complaints + upheld, oldLeads, oldLeadsFollowedUp: followedUp, listings, listingsRejected: rejected,
    };
  }

  /** A seller's confidence. Someone who has not started verification is simply "not yet verified". */
  async dealer(userId: string): Promise<Confidence> {
    const facts = await this.dealerFacts(userId);
    return dealerConfidence(facts ?? { kind: 'AGENT', approved: false, checkIdentity: false, checkRera: false, checkPhone: false, checkAddress: false, complaints: 0, oldLeads: 0, oldLeadsFollowedUp: 0, listings: 0, listingsRejected: 0 });
  }

  private async judge(p: ForConfidence, seller: Confidence | null, area?: { rate: number | null; homes: number }): Promise<Confidence> {
    const a = area ?? (await this.areaRate(p.localityId));
    return propertyConfidence({
      seller, staffVerified: p.staffVerified, photos: p._count.photos, underConstruction: p.status === 'UNDER_CONSTRUCTION', reraOnRecord: !!p.project?.reraId,
      pricePerSqft: p.priceInr / p.areaSqft, areaRate: a.rate, areaHomes: a.homes,
    });
  }
  private async areaRate(localityId: string) {
    const a = await this.db.property.aggregate({ where: { localityId, state: 'PUBLISHED' }, _count: true, _sum: { priceInr: true, areaSqft: true } });
    return { rate: a._sum.areaSqft ? Number(a._sum.priceInr ?? 0) / a._sum.areaSqft : null, homes: a._count };
  }
  /** Only a seller with their own account (an owner or agent) has a dealer confidence; homes added by our team have none. */
  private sellerOf = (p: { ownerId: string | null; owner: { role: string } | null }) => (p.ownerId && p.owner?.role === 'AGENT' ? p.ownerId : null);

  /** The confidence of one listing with its reasons, for the property page. */
  async property(id: string): Promise<Confidence> {
    const p = await this.db.property.findUniqueOrThrow({ where: { id }, select: FOR_CONFIDENCE });
    const sellerId = this.sellerOf(p);
    return this.judge(p, sellerId ? await this.dealer(sellerId) : null);
  }

  /** Stores a listing's level so listings can be ordered by it. Call after anything it depends on changes. */
  async refreshProperty(id: string): Promise<void> {
    const c = await this.property(id).catch(() => null);
    if (c) await this.db.property.update({ where: { id }, data: { confidence: c.level } });
  }

  /** Stores a seller's level and re-judges all their listings. */
  async refreshDealer(userId: string): Promise<void> {
    const seller = await this.dealer(userId);
    await this.db.dealerProfile.updateMany({ where: { userId }, data: { level: seller.level } });
    const homes = await this.db.property.findMany({ where: { ownerId: userId }, select: FOR_CONFIDENCE });
    for (const p of homes) {
      const c = await this.judge(p, this.sellerOf(p) ? seller : null);
      await this.db.property.update({ where: { id: p.id }, data: { confidence: c.level } });
    }
  }

  /** Re-judges everything. Run daily, because follow-up rates and area averages drift without any single change triggering it. */
  async refreshAll(): Promise<{ homes: number; changed: number }> {
    const homes = await this.db.property.findMany({ select: { ...FOR_CONFIDENCE, confidence: true } });
    const sellers = new Map<string, Confidence>();
    const areas = new Map<string, { rate: number | null; homes: number }>();
    let changed = 0;
    for (const p of homes) {
      const sellerId = this.sellerOf(p);
      if (sellerId && !sellers.has(sellerId)) sellers.set(sellerId, await this.dealer(sellerId));
      if (!areas.has(p.localityId)) areas.set(p.localityId, await this.areaRate(p.localityId));
      const c = await this.judge(p, sellerId ? sellers.get(sellerId)! : null, areas.get(p.localityId));
      if (c.level !== p.confidence) { await this.db.property.update({ where: { id: p.id }, data: { confidence: c.level } }); changed++; }
    }
    for (const [userId, c] of sellers) await this.db.dealerProfile.updateMany({ where: { userId }, data: { level: c.level } });
    return { homes: homes.length, changed };
  }

  // ---- What buyers may see about a seller

  /** A seller's public card: who they are and how far we have verified them. No contact details, documents or staff notes. */
  async publicDealer(userId: string) {
    const u = await this.db.user.findFirst({ where: { id: userId, role: 'AGENT', active: true }, select: { id: true, name: true, createdAt: true, dealer: { select: { kind: true, firmName: true, yearsInBusiness: true, cities: true, status: true, about: true } } } });
    if (!u) return null;
    const approved = u.dealer?.status === 'APPROVED';
    return {
      id: u.id, name: u.name, since: u.createdAt, confidence: await this.dealer(u.id),
      // What a seller wrote about themselves is shown only once staff have approved the profile.
      kind: u.dealer?.kind ?? null, firmName: approved ? u.dealer!.firmName : null, yearsInBusiness: approved ? u.dealer!.yearsInBusiness : null,
      cities: approved ? u.dealer!.cities : [], about: approved ? u.dealer!.about : null,
    };
  }

  // ---- Onboarding: the seller's own profile and documents

  private mustBeSeller(user: SessionUser) { if (user.role !== 'AGENT') throw new ForbiddenException('Verification is for owners and agents who post listings'); }

  async myProfile(user: SessionUser) {
    this.mustBeSeller(user);
    const profile = await this.db.dealerProfile.findUnique({ where: { userId: user.id }, include: { documents: { orderBy: { createdAt: 'asc' }, select: { id: true, kind: true, mime: true, sizeBytes: true, createdAt: true } } } });
    if (!profile) return { profile: null, confidence: await this.dealer(user.id), retentionDays: RETENTION_DAYS };
    const { internalNote, complaints, level, ...mine } = profile; // staff's notes are not the seller's to read
    return { profile: mine, confidence: await this.dealer(user.id), retentionDays: RETENTION_DAYS };
  }

  private answers(body: Record<string, unknown>) {
    const i = new Input(body);
    const kind = i.oneOf('kind', 'You are', Object.values(DealerKind));
    const website = i.optionalText('website', 'Website', 200);
    if (website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(website)) throw new BadRequestException('Website must start with http:// or https://');
    return {
      kind, firmName: i.optionalText('firmName', 'Firm name', 120), yearsInBusiness: i.optionalNumber('yearsInBusiness', 'Years in business', 0, 80),
      officeAddress: i.optionalText('officeAddress', 'Address', 300), cities: i.list('cities', 'Cities you work in', 10),
      reraNumber: i.optionalText('reraNumber', 'RERA registration number', 80), gstNumber: i.optionalText('gstNumber', 'GST number', 20), website,
      ownerRelation: i.optionalText('ownerRelation', 'Your connection to the property', 120), about: i.optionalText('about', 'About you', 600),
    };
  }

  /** Saves the answers. Changing anything after approval sends the profile back for review, so the public label never rests on answers nobody checked. */
  async saveProfile(user: SessionUser, body: Record<string, unknown>) {
    this.mustBeSeller(user);
    const data = this.answers(body);
    const current = await this.db.dealerProfile.findUnique({ where: { userId: user.id } });
    if (current?.status === 'SUBMITTED') throw new ConflictException('Your details are with our team for review and cannot be changed until they reply');
    const reset = current?.status === 'APPROVED' || current?.status === 'REJECTED'
      ? { status: 'DRAFT' as const, checkIdentity: false, checkRera: false, checkPhone: false, checkAddress: false }
      : {};
    await this.db.dealerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: { ...data, ...reset } });
    await this.refreshDealer(user.id);
    return this.myProfile(user);
  }

  /** Sends the profile to staff. Checks that what the seller's kind requires has been provided. */
  async submitProfile(user: SessionUser) {
    this.mustBeSeller(user);
    const p = await this.db.dealerProfile.findUnique({ where: { userId: user.id }, include: { documents: { select: { kind: true } } } });
    if (!p) throw new BadRequestException('Fill in and save your details first');
    if (p.status === 'SUBMITTED') throw new ConflictException('Already sent for review');
    if (p.status === 'APPROVED') throw new ConflictException('You are already verified');
    const has = (k: DocumentKind) => p.documents.some((d) => d.kind === k);
    const missing: string[] = [];
    if (!p.officeAddress) missing.push('your address');
    if (!p.cities.length) missing.push('the cities you work in');
    if (!has('ID_PROOF')) missing.push('an identity document');
    if (p.kind === 'AGENT') {
      if (!p.reraNumber) missing.push('your RERA registration number');
      if (!has('RERA_CERTIFICATE')) missing.push('your RERA certificate');
    }
    if (p.kind === 'BUILDER') {
      if (!p.firmName) missing.push('the company name');
      if (!has('BUSINESS_PROOF')) missing.push('a business document (GST or incorporation certificate)');
    }
    if (p.kind === 'OWNER') {
      if (!p.ownerRelation) missing.push('your connection to the property');
      if (!has('OWNERSHIP_PROOF')) missing.push('a document showing ownership');
    }
    if (missing.length) throw new BadRequestException(`Before sending, please add: ${missing.join('; ')}.`);
    await this.db.dealerProfile.update({ where: { userId: user.id }, data: { status: 'SUBMITTED', submittedAt: new Date(), reviewNote: null } });
    return this.myProfile(user);
  }

  async addDocument(user: SessionUser, kindRaw: unknown, file: { buffer: Buffer; size: number } | undefined) {
    this.mustBeSeller(user);
    const kind = Object.values(DocumentKind).find((k) => k === kindRaw);
    if (!kind) throw new BadRequestException('Choose what kind of document this is');
    if (!file?.buffer?.length) throw new BadRequestException('Choose a file');
    if (file.size > MAX_DOCUMENT_BYTES) throw new BadRequestException('Each document must be under 5 MB');
    const type = sniffDocument(file.buffer);
    if (!type) throw new BadRequestException('Documents must be PDF, JPEG or PNG files');
    const profile = await this.db.dealerProfile.findUnique({ where: { userId: user.id }, include: { _count: { select: { documents: true } } } });
    if (!profile) throw new BadRequestException('Save your details before adding documents');
    if (profile.status === 'SUBMITTED') throw new ConflictException('Your details are with our team for review and cannot be changed until they reply');
    if (profile._count.documents >= MAX_DOCUMENTS) throw new BadRequestException(`You can add at most ${MAX_DOCUMENTS} documents. Delete one first.`);
    const saved = await saveDocument(file.buffer, type);
    await this.db.dealerDocument.create({ data: { userId: user.id, kind, file: saved.file, mime: saved.mime, sizeBytes: file.size } });
    return { ok: true };
  }

  /** The seller may delete their own documents (not while under review); staff may delete any. */
  async removeDocument(user: SessionUser, id: string) {
    const doc = await this.db.dealerDocument.findUnique({ where: { id }, include: { profile: { select: { status: true } } } });
    if (!doc || (!isStaff(user) && doc.userId !== user.id)) throw new NotFoundException('Document not found');
    if (!isStaff(user) && doc.profile.status === 'SUBMITTED') throw new ConflictException('Your details are with our team for review and cannot be changed until they reply');
    await this.db.dealerDocument.delete({ where: { id } });
    await deleteDocument(doc.file);
    return { ok: true, userId: doc.userId };
  }

  /** The file itself, for the seller it belongs to or for staff. Anyone else is told it does not exist. */
  async documentFile(user: SessionUser, id: string) {
    const doc = await this.db.dealerDocument.findUnique({ where: { id } });
    if (!doc || (!isStaff(user) && doc.userId !== user.id)) throw new NotFoundException('Document not found');
    const data = await readDocument(doc.file);
    if (!data) throw new NotFoundException('Document not found');
    if (isStaff(user)) this.log.log(`${user.name} (${user.role}) opened ${doc.kind} of dealer ${doc.userId}`); // a trail of who looked at identity papers
    return { data, mime: doc.mime, kind: doc.kind };
  }

  // ---- Staff review

  async dealers(q: { status?: string }) {
    const status = Object.values(DealerStatus).find((s) => s === q.status);
    const rows = await this.db.dealerProfile.findMany({
      where: status ? { status } : { status: { not: 'DRAFT' } }, orderBy: [{ submittedAt: 'desc' }],
      select: { userId: true, kind: true, firmName: true, status: true, submittedAt: true, reviewedAt: true, level: true, complaints: true, user: { select: { name: true, email: true, active: true, _count: { select: { properties: true } } } }, _count: { select: { documents: true } } },
    });
    const waiting = await this.db.dealerProfile.count({ where: { status: 'SUBMITTED' } });
    return { items: rows, waiting };
  }

  async dealerForReview(userId: string) {
    const profile = await this.db.dealerProfile.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true, phone: true, active: true, createdAt: true, emailVerified: true } }, documents: { orderBy: { createdAt: 'asc' }, select: { id: true, kind: true, mime: true, sizeBytes: true, createdAt: true } } },
    });
    if (!profile) throw new NotFoundException('This seller has not started verification');
    return { profile, facts: await this.dealerFacts(userId), confidence: await this.dealer(userId), retentionDays: RETENTION_DAYS };
  }

  /** Staff record what they checked and decide. Only ticked checks count, and approval needs at least the identity check. */
  async review(staff: SessionUser, userId: string, body: Record<string, unknown>) {
    const i = new Input(body);
    const decision = i.oneOf('decision', 'Decision', ['approve', 'needs_info', 'reject', 'update'] as const);
    const profile = await this.db.dealerProfile.findUnique({ where: { userId }, include: { user: { select: { name: true, email: true } } } });
    if (!profile) throw new NotFoundException('This seller has not started verification');
    if (profile.status === 'DRAFT') throw new ConflictException('This seller has not sent their details for review yet');
    const tick = (k: string) => body[k] === 'on' || body[k] === 'true' || body[k] === true;
    const checks = { checkIdentity: tick('checkIdentity'), checkRera: tick('checkRera'), checkPhone: tick('checkPhone'), checkAddress: tick('checkAddress') };
    const reviewNote = i.optionalText('reviewNote', 'Message to the seller', 500);
    if (decision === 'approve' && !checks.checkIdentity) throw new BadRequestException('Tick “Identity confirmed” before approving. A seller cannot be approved on their word alone.');
    if ((decision === 'needs_info' || decision === 'reject') && !reviewNote) throw new BadRequestException('Tell the seller what is needed or why, in the message to the seller');
    const status: DealerStatus = decision === 'approve' ? 'APPROVED' : decision === 'needs_info' ? 'NEEDS_INFO' : decision === 'reject' ? 'REJECTED' : profile.status;
    await this.db.dealerProfile.update({
      where: { userId },
      data: {
        // Checks stand only while the seller is approved; otherwise nothing is counted in their favour.
        ...(status === 'APPROVED' ? checks : { checkIdentity: false, checkRera: false, checkPhone: false, checkAddress: false }),
        status, reviewNote, internalNote: i.optionalText('internalNote', 'Internal note', 1000), complaints: i.optionalNumber('complaints', 'Upheld complaints', 0, 99) ?? 0,
        ...(decision !== 'update' ? { reviewedAt: new Date(), reviewedBy: staff.name } : {}),
      },
    });
    await this.refreshDealer(userId);
    if (decision !== 'update') {
      const text = decision === 'approve' ? 'Your verification is complete. Buyers now see you as a verified seller on your listings.'
        : decision === 'needs_info' ? `We need a little more before we can verify you:\n\n${reviewNote}` : `We could not verify you:\n\n${reviewNote}`;
      await this.mail.send({ to: profile.user.email, subject: decision === 'approve' ? 'You are verified' : decision === 'needs_info' ? 'More needed for your verification' : 'About your verification', text: `Hello ${profile.user.name},\n\n${text}\n\n${SITE_URL}/admin/verification` });
    }
    return this.dealerForReview(userId);
  }

  /** Deletes a seller's uploaded papers while keeping the record of what was verified. */
  async purgeDocuments(userId: string): Promise<{ deleted: number }> {
    const docs = await this.db.dealerDocument.findMany({ where: { userId } });
    await this.db.dealerDocument.deleteMany({ where: { userId } });
    await Promise.all(docs.map((d) => deleteDocument(d.file)));
    return { deleted: docs.length };
  }

  /** Daily: papers are deleted a set number of days after the review they were uploaded for. */
  async purgeExpiredDocuments(now = new Date()): Promise<number> {
    const due = await this.db.dealerProfile.findMany({ where: { status: { in: ['APPROVED', 'REJECTED'] }, reviewedAt: { lt: new Date(now.getTime() - RETENTION_DAYS * 86_400_000) }, documents: { some: {} } }, select: { userId: true } });
    let deleted = 0;
    for (const d of due) deleted += (await this.purgeDocuments(d.userId)).deleted;
    return deleted;
  }

  // ---- Reports from buyers

  /**
   * A buyer reports a listing or its seller. Nothing changes for the seller yet: a report is an accusation, and
   * anyone can make one, so it only counts once staff have looked into it and upheld it.
   */
  async report(slug: string, body: Record<string, unknown>) {
    const i = new Input(body);
    const reason = i.oneOf('reason', 'What is wrong', Object.values(ReportReason));
    const details = i.text('details', 'What happened', 1000);
    if (details.length < 15) throw new BadRequestException('Please tell us a little more about what happened, so we can look into it');
    const reporterName = i.text('name', 'Your name', 80);
    const reporterPhone = i.text('phone', 'Phone', 20).replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,13}$/.test(reporterPhone)) throw new BadRequestException('Enter a phone number with 10 to 13 digits, so we can contact you about your report');
    const reporterEmail = i.optionalText('email', 'Email', 160);
    if (reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) throw new BadRequestException('Enter a valid email address, or leave it empty');
    const p = await this.db.property.findFirst({ where: { slug, state: 'PUBLISHED' }, select: { id: true, title: true, ownerId: true, owner: { select: { role: true } } } });
    if (!p) throw new NotFoundException('Property not found');
    const publicToken = randomBytes(18).toString('base64url');
    await this.db.report.create({ data: { reason, details, reporterName, reporterPhone, reporterEmail, publicToken, listingTitle: p.title, propertyId: p.id, sellerId: this.sellerOf(p) } });
    if (reporterEmail) {
      await this.mail.send({ to: reporterEmail, subject: 'We have your report', text: `Hello ${reporterName},\n\nThank you for reporting "${p.title}". Our team will look into it and email you the outcome. You can also check it here at any time:\n${SITE_URL}/report-status/${publicToken}\n\nWe do not tell the seller who reported them.` });
    }
    const staff = await this.db.user.findMany({ where: { role: { in: ['ADMIN', 'EDITOR'] }, active: true }, select: { email: true, name: true } });
    for (const s of staff) {
      await this.mail.send({ to: s.email, subject: `A buyer reported a listing: ${p.title}`, text: `Hello ${s.name},\n\nA buyer has reported "${p.title}".\n\nReason: ${reason.replace(/_/g, ' ').toLowerCase()}\n\nLook into it and decide:\n${SITE_URL}/admin/reports` });
    }
    return { ok: true, token: publicToken };
  }

  /** What the buyer is told: the standard wording for the decision, plus anything staff added for them. Never staff's own notes. */
  private outcome(r: { status: ReportStatus; tookDown: boolean; buyerNote: string | null; sellerId: string | null }): string {
    // Only say what actually happened: a home listed by our own team has no seller whose level could change.
    const action = r.sellerId
      ? `The seller’s confidence level has been lowered for all buyers${r.tookDown ? ', and the listing has been taken off the site' : ''}.`
      : r.tookDown ? 'The listing has been taken off the site.' : 'This home was listed by our own team, and we are correcting the listing.';
    const base = r.status === 'NEW' ? 'Our team is looking into your report. Nothing has been decided yet.'
      : r.status === 'UPHELD' ? `We looked into your report and upheld it. ${action}`
        : 'We looked into your report and could not confirm it, so we have not acted against the seller. If you have more to show us, such as messages or a receipt, please send a new report.';
    return r.buyerNote ? `${base}\n\n${r.buyerNote}` : base;
  }

  /** The outcome of one report, for whoever holds its private link. Says nothing about the seller beyond the decision. */
  async reportStatus(token: string) {
    const r = token ? await this.db.report.findUnique({ where: { publicToken: token } }) : null;
    if (!r) throw new NotFoundException('Report not found');
    return { status: r.status, listingTitle: r.listingTitle, reason: r.reason, createdAt: r.createdAt, decidedAt: r.decidedAt, message: this.outcome(r) };
  }

  async reports(q: { status?: string }) {
    const status = Object.values(ReportStatus).find((s) => s === q.status);
    const [items, waiting] = await Promise.all([
      this.db.report.findMany({
        where: status ? { status } : {}, orderBy: { createdAt: 'desc' }, take: 200,
        include: { property: { select: { id: true, slug: true, state: true } }, seller: { select: { id: true, name: true, email: true, phone: true } } },
      }),
      this.db.report.count({ where: { status: 'NEW' } }),
    ]);
    return { items, waiting };
  }

  /**
   * Staff decide a report after looking into it. Upholding it counts as a complaint against the seller, which holds
   * them at the basic level; the listing can be taken off the site in the same step. A decision can be changed later.
   */
  async decideReport(staff: SessionUser, id: string, body: Record<string, unknown>) {
    const i = new Input(body);
    const decision = i.oneOf('decision', 'Decision', ['uphold', 'dismiss'] as const);
    const note = i.text('note', 'What you found', 500);
    const report = await this.db.report.findUnique({ where: { id }, include: { property: { select: { id: true, state: true } } } });
    if (!report) throw new NotFoundException('Report not found');
    const takeDown = decision === 'uphold' && (body.takeDown === 'on' || body.takeDown === 'true' || body.takeDown === true);
    const willBeDown = takeDown && !!report.property && report.property.state === 'PUBLISHED';
    const updated = await this.db.report.update({
      where: { id },
      data: { status: decision === 'uphold' ? 'UPHELD' : 'DISMISSED', staffNote: note, buyerNote: i.optionalText('buyerNote', 'Message to the buyer', 400), tookDown: decision === 'uphold' && (willBeDown || report.tookDown), decidedAt: new Date(), decidedBy: staff.name },
    });
    // The buyer hears the outcome: by email if they left one, and always on their private link.
    if (updated.reporterEmail) {
      await this.mail.send({ to: updated.reporterEmail, subject: 'The outcome of your report', text: `Hello ${updated.reporterName},\n\nAbout your report of "${updated.listingTitle}":\n\n${this.outcome(updated)}\n\n${SITE_URL}/report-status/${updated.publicToken}` });
    }
    if (takeDown && report.property && report.property.state === 'PUBLISHED') {
      await this.db.property.update({ where: { id: report.property.id }, data: { state: 'REJECTED', rejectReason: 'Taken off the site after a buyer’s report was upheld. Contact our team.', staffVerified: false, staffVerifiedNote: null, staffVerifiedAt: null, staffVerifiedBy: null } });
    }
    if (report.sellerId) await this.refreshDealer(report.sellerId);
    else if (report.property) await this.refreshProperty(report.property.id);
    return { ok: true, takenDown: takeDown };
  }

  /** Staff confirm they have checked a particular home's papers or visited it, or withdraw that. */
  async verifyProperty(staff: SessionUser, id: string, body: Record<string, unknown>) {
    const i = new Input(body);
    const verified = body.verified === 'true' || body.verified === true;
    const note = i.optionalText('note', 'What was checked', 300);
    if (verified && !note) throw new BadRequestException('Say what was checked, for example “Sale deed and society NOC seen” or “Visited on 12 Nov”');
    if (!(await this.db.property.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Property not found');
    await this.db.property.update({ where: { id }, data: { staffVerified: verified, staffVerifiedNote: verified ? note : null, staffVerifiedAt: verified ? new Date() : null, staffVerifiedBy: verified ? staff.name : null } });
    await this.refreshProperty(id);
    return { ok: true, confidence: await this.property(id) };
  }
}

export type { Level };

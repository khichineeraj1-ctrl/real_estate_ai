import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConstructionStatus, LeadStatus, ListedBy, ListingState, Prisma, PropertyType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrustService } from '../trust/trust.service';
import { Mailer, SITE_URL } from '../mail/mailer';
import { SessionUser, emailSecret, hashEmailSecret, hashPassword, isStaff, issueToken, normalEmail, verifyPassword } from './auth';
import { IMPORT_COLUMNS, parseCsv } from './csv';
import { Input, slugify } from './input';
import { MAX_PHOTOS_PER_LISTING, MAX_PHOTO_BYTES, ProcessedPhoto, processPhoto, removePhoto, savePhoto, sniffImage } from './photos';

const PAGE = 25;
const MAX_IMPORT_ROWS = 500;
/** Questions the listings could not answer as asked: nothing found, or found only after widening the search. */
const NO_EXACT_MATCH: Prisma.QuestionWhereInput = { OR: [{ total: 0 }, { relaxed: { not: null } }] };
const page = (v: unknown) => Math.max(1, Number.parseInt(String(v ?? '1'), 10) || 1);
const USER_PUBLIC = { id: true, email: true, name: true, phone: true, role: true, active: true, emailVerified: true, createdAt: true } satisfies Prisma.UserSelect;

@Injectable()
export class AdminService implements OnModuleInit {
  private log = new Logger('Admin');
  constructor(private readonly db: PrismaService, private readonly mail: Mailer, private readonly trust: TrustService) {}

  /** The owner account comes from the environment, so there is always a way in; every other account lives in the database. */
  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL && normalEmail(process.env.ADMIN_EMAIL);
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) { this.log.warn('ADMIN_EMAIL / ADMIN_PASSWORD are not set: no owner account was created.'); return; }
    const passwordHash = hashPassword(password);
    await this.db.user.upsert({ where: { email }, create: { email, name: 'Owner', role: 'ADMIN', passwordHash, emailVerified: new Date() }, update: { role: 'ADMIN', active: true, passwordHash, emailVerified: new Date() } });
  }

  // ---- Accounts

  private password(i: Input, key = 'password', label = 'Password') {
    const p = i.text(key, label, 200);
    if (p.length < 10) throw new BadRequestException(`${label} must be at least 10 characters`);
    return p;
  }
  private email(i: Input) {
    const e = normalEmail(i.text('email', 'Email', 160));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new BadRequestException('Enter a valid email address');
    return e;
  }

  async login(email: unknown, password: unknown) {
    const user = typeof email === 'string' ? await this.db.user.findUnique({ where: { email: normalEmail(email) } }) : null;
    // The hash is checked even for an unknown email, so the response time does not reveal which emails have accounts.
    const ok = verifyPassword(typeof password === 'string' ? password : '', user?.passwordHash ?? 'scrypt$00$00');
    if (!user || !ok || !user.active) throw new UnauthorizedException('Wrong email or password');
    return { token: issueToken(user), role: user.role, name: user.name };
  }

  /** Open sign-up for owners, agents and builders. They can only manage their own listings, and staff approve each one. */
  async register(body: Record<string, unknown>) {
    const i = new Input(body);
    const data = { name: i.text('name', 'Name', 80), email: this.email(i), phone: this.phone(i, true), passwordHash: hashPassword(this.password(i)) };
    if (await this.db.user.findUnique({ where: { email: data.email }, select: { id: true } })) throw new ConflictException('An account with this email already exists. Sign in instead.');
    const kind = (['OWNER', 'AGENT', 'BUILDER'] as const).find((k) => k === body.kind);
    // What they chose under "I am" starts their verification profile, so they are not asked again later.
    const user = await this.db.user.create({ data: { ...data, role: 'AGENT', ...(kind ? { dealer: { create: { kind } } } : {}) } });
    await this.sendVerification(user);
    return { token: issueToken(user), role: user.role, name: user.name };
  }

  // ---- Links sent by email: confirm an address, reset a password. Single use, and only a hash is stored.

  private isOwner(email: string) { return email === (process.env.ADMIN_EMAIL && normalEmail(process.env.ADMIN_EMAIL)); }

  private async emailLink(userId: string, kind: 'VERIFY' | 'RESET', hours: number, path: string) {
    const { secret, hash } = emailSecret();
    await this.db.emailToken.deleteMany({ where: { userId, kind } }); // a new link replaces any earlier one
    await this.db.emailToken.create({ data: { userId, kind, tokenHash: hash, expiresAt: new Date(Date.now() + hours * 3_600_000) } });
    return `${SITE_URL}${path}?token=${secret}`;
  }
  private async redeem(secret: unknown, kind: 'VERIFY' | 'RESET') {
    const row = typeof secret === 'string' && secret ? await this.db.emailToken.findUnique({ where: { tokenHash: hashEmailSecret(secret) } }) : null;
    if (!row || row.kind !== kind || row.usedAt || row.expiresAt < new Date()) throw new BadRequestException('This link has expired or was already used. Ask for a new one.');
    await this.db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    return row.userId;
  }

  private async sendVerification(user: { id: string; email: string; name: string }) {
    const link = await this.emailLink(user.id, 'VERIFY', 48, '/admin/verify');
    await this.mail.send({ to: user.email, subject: 'Confirm your email address', text: `Hello ${user.name},\n\nOpen this link to confirm your email address and start posting your property:\n${link}\n\nThe link works once and expires in 48 hours. If you did not create this account, ignore this email.` });
  }
  async resendVerification(user: SessionUser) {
    if (user.emailVerified) return { ok: true, already: true };
    await this.sendVerification(user);
    return { ok: true };
  }
  async verifyEmail(secret: unknown) {
    const userId = await this.redeem(secret, 'VERIFY');
    await this.db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
    return { ok: true };
  }

  /** Always answers the same way, so this cannot be used to find out which emails have accounts. */
  async forgotPassword(email: unknown) {
    const user = typeof email === 'string' ? await this.db.user.findUnique({ where: { email: normalEmail(email) } }) : null;
    // The owner account's password comes from the API's settings, so it has no reset link.
    if (user?.active && !this.isOwner(user.email)) {
      const link = await this.emailLink(user.id, 'RESET', 1, '/admin/reset');
      await this.mail.send({ to: user.email, subject: 'Reset your password', text: `Hello ${user.name},\n\nOpen this link to choose a new password:\n${link}\n\nThe link works once and expires in 1 hour. If you did not ask for this, ignore this email; your password stays the same.` });
    }
    return { ok: true };
  }
  async resetPassword(body: Record<string, unknown>) {
    const password = this.password(new Input(body), 'password', 'New password'); // checked before the link is used up
    const userId = await this.redeem(body?.token, 'RESET');
    // Opening a link from the mailbox also proves the address, and the new password ends every older session.
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(password), emailVerified: new Date() } });
    return { ok: true };
  }
  private phone(i: Input, required: boolean) {
    const raw = required ? i.text('phone', 'Phone', 20) : i.optionalText('phone', 'Phone', 20);
    if (raw == null) return null;
    const digits = raw.replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,13}$/.test(digits)) throw new BadRequestException('Enter a phone number with 10 to 13 digits');
    return digits;
  }

  me(user: SessionUser) { return this.db.user.findUniqueOrThrow({ where: { id: user.id }, select: USER_PUBLIC }); }

  async changePassword(user: SessionUser, body: Record<string, unknown>) {
    const i = new Input(body);
    const current = await this.db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!verifyPassword(i.text('current', 'Current password'), current.passwordHash)) throw new BadRequestException('Current password is wrong');
    if (this.isOwner(current.email)) throw new ConflictException('The owner account\'s password is set by ADMIN_PASSWORD on the API and cannot be changed here');
    const updated = await this.db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(this.password(i, 'password', 'New password')) } });
    // Every other session ends with the old password; this one continues with a fresh token.
    return { ok: true, token: issueToken(updated) };
  }

  users() { return this.db.user.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }], select: { ...USER_PUBLIC, _count: { select: { properties: true, projects: true } } } }); }
  async user(id: string) {
    const u = await this.db.user.findUnique({ where: { id }, select: USER_PUBLIC });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }
  async createUser(body: Record<string, unknown>) {
    const i = new Input(body);
    const data = { name: i.text('name', 'Name', 80), email: this.email(i), phone: this.phone(i, false), role: i.oneOf('role', 'Role', Object.values(Role)), passwordHash: hashPassword(this.password(i)), emailVerified: new Date() }; // an admin vouches for the address
    if (await this.db.user.findUnique({ where: { email: data.email }, select: { id: true } })) throw new ConflictException('An account with this email already exists');
    return this.db.user.create({ data, select: USER_PUBLIC });
  }
  async updateUser(actor: SessionUser, id: string, body: Record<string, unknown>) {
    const target = await this.user(id);
    const i = new Input(body);
    const role = i.oneOf('role', 'Role', Object.values(Role));
    const active = i.oneOf('active', 'Status', ['true', 'false'] as const) === 'true';
    // Nobody can lock themselves out, and the owner account from the environment always stays an active admin.
    if (id === actor.id && (role !== 'ADMIN' || !active)) throw new ConflictException('You cannot remove your own admin access');
    if (this.isOwner(target.email) && (role !== 'ADMIN' || !active)) throw new ConflictException('The owner account must stay an active admin');
    const newPassword = i.optionalText('password', 'New password', 200);
    return this.db.user.update({
      where: { id }, select: USER_PUBLIC,
      data: { name: i.text('name', 'Name', 80), phone: this.phone(i, false), role, active, ...(newPassword ? { passwordHash: hashPassword(this.password(i, 'password', 'New password')) } : {}) },
    });
  }

  // ---- Overview and form options

  /**
   * What a builder login may see: leads on its assigned projects, and enquiries on those projects' listings unless
   * the listing was posted by an owner or agent (that buyer agreed to share their details with that seller only).
   */
  private builderLeads(user: SessionUser): Prisma.EnquiryWhereInput {
    return { project: { accountId: user.id }, OR: [{ propertyId: null }, { property: { NOT: { owner: { is: { role: 'AGENT' } } } } }] };
  }

  async overview(user: SessionUser) {
    if (user.role === 'BUILDER') {
      const weekAgo = new Date(Date.now() - 7 * 86_400_000);
      const projects = await this.db.project.findMany({ where: { accountId: user.id }, orderBy: { name: 'asc' }, select: { id: true, slug: true, name: true, locality: { select: { name: true, city: { select: { name: true } } } } } });
      const mine = this.builderLeads(user);
      const withCounts = await Promise.all(projects.map(async (p) => ({
        ...p, leads: await this.db.enquiry.count({ where: { AND: [mine, { projectId: p.id }] } }), leadsNew: await this.db.enquiry.count({ where: { AND: [mine, { projectId: p.id, partnerStatus: 'NEW' }] } }), leadsWeek: await this.db.enquiry.count({ where: { AND: [mine, { projectId: p.id, createdAt: { gte: weekAgo } }] } }),
      })));
      return { role: user.role, name: user.name, projects: withCounts };
    }
    if (!isStaff(user)) {
      const mine = await this.db.property.groupBy({ by: ['state'], where: { ownerId: user.id }, _count: true });
      const n = (s: ListingState) => mine.find((m) => m.state === s)?._count ?? 0;
      const enquiries = await this.db.enquiry.count({ where: { property: { ownerId: user.id } } });
      const enquiriesNew = await this.db.enquiry.count({ where: { property: { ownerId: user.id }, partnerStatus: 'NEW' } });
      return { role: user.role, name: user.name, enquiries, enquiriesNew, mine: { published: n('PUBLISHED'), pending: n('PENDING'), rejected: n('REJECTED') } };
    }
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const enquiries = await this.db.enquiry.count({ where: { createdAt: { gte: weekAgo } } });
    const enquiriesNew = await this.db.enquiry.count({ where: { status: 'NEW' } });
    const [reportsNew, sellersWaiting] = await Promise.all([this.db.report.count({ where: { status: 'NEW' } }), this.db.dealerProfile.count({ where: { status: 'SUBMITTED' } })]);
    const [cities, localities, projects, properties, pending, questions, questionsWeek, emptyWeek] = await Promise.all([
      this.db.city.count(), this.db.locality.count(), this.db.project.count(), this.db.property.count({ where: { state: 'PUBLISHED' } }), this.db.property.count({ where: { state: 'PENDING' } }),
      this.db.question.count(), this.db.question.count({ where: { createdAt: { gte: weekAgo } } }), this.db.question.count({ where: { createdAt: { gte: weekAgo }, ...NO_EXACT_MATCH } }),
    ]);
    return { role: user.role, name: user.name, enquiries, enquiriesNew, reportsNew, sellersWaiting, cities, localities, projects, properties, pending, questions, questionsWeek, emptyWeek };
  }

  /** Everything the forms need for their dropdowns. */
  async options() {
    const cities = await this.db.city.findMany({
      orderBy: { name: 'asc' }, select: { id: true, name: true, localities: { orderBy: { name: 'asc' }, select: { id: true, name: true, projects: { orderBy: { name: 'asc' }, select: { id: true, name: true } } } } },
    });
    return { cities };
  }

  // ---- Properties. Staff see every listing; an agent sees and changes only their own.

  private scope(user: SessionUser): Prisma.PropertyWhereInput { return isStaff(user) ? {} : { ownerId: user.id }; }

  async properties(user: SessionUser, q: { q?: string; state?: string; page?: string }) {
    const state = Object.values(ListingState).includes(q.state as ListingState) ? (q.state as ListingState) : undefined;
    const where: Prisma.PropertyWhereInput = {
      ...this.scope(user), ...(state ? { state } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { slug: { contains: q.q, mode: 'insensitive' } }] } : {}),
    };
    const p = page(q.page);
    const [items, total, pending] = await Promise.all([
      this.db.property.findMany({
        where, orderBy: [{ postedAt: 'desc' }, { slug: 'asc' }], skip: (p - 1) * PAGE, take: PAGE,
        select: { id: true, slug: true, title: true, priceInr: true, status: true, state: true, postedAt: true, confidence: true, staffVerified: true, owner: { select: { name: true } }, _count: { select: { photos: true } } },
      }),
      this.db.property.count({ where }), this.db.property.count({ where: { ...this.scope(user), state: 'PENDING' } }),
    ]);
    return { items, total, pending, page: p, pageSize: PAGE };
  }

  async property(user: SessionUser, id: string) {
    const p = await this.propertyRow(user, id);
    return { ...p, confidenceDetail: await this.trust.property(id) };
  }
  private async propertyRow(user: SessionUser, id: string) {
    const p = await this.db.property.findFirst({ where: { id, ...this.scope(user) }, include: { photos: { orderBy: { position: 'asc' }, select: { id: true, file: true } }, owner: { select: { name: true, email: true, phone: true } } } });
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  private async propertyData(body: Record<string, unknown>) {
    const i = new Input(body);
    const type = i.oneOf('type', 'Type', Object.values(PropertyType));
    const plot = type === 'PLOT';
    const localityId = i.text('localityId', 'Locality');
    const projectId = i.optionalText('projectId', 'Project');
    if (!(await this.db.locality.findUnique({ where: { id: localityId }, select: { id: true } }))) throw new BadRequestException('Choose a locality from the list');
    if (projectId) {
      const project = await this.db.project.findUnique({ where: { id: projectId }, select: { localityId: true } });
      if (!project || project.localityId !== localityId) throw new BadRequestException('That project is not in the chosen locality');
    }
    const floor = plot ? null : i.optionalNumber('floor', 'Floor', 0, 150);
    const totalFloors = plot ? null : i.optionalNumber('totalFloors', 'Total floors', 1, 150);
    if (floor != null && totalFloors != null && floor > totalFloors) throw new BadRequestException('Floor cannot be higher than total floors');
    const status = i.oneOf('status', 'Status', Object.values(ConstructionStatus));
    return {
      title: i.text('title', 'Title', 160), description: i.text('description', 'Description', 2000), type,
      bhk: plot ? 0 : i.number('bhk', 'Bedrooms (BHK)', 1, 10), bathrooms: plot ? 0 : i.number('bathrooms', 'Bathrooms', 1, 12),
      priceInr: i.number('priceInr', 'Price', 100_000, 2_000_000_000), areaSqft: i.number('areaSqft', 'Area', 100, 200_000),
      floor, totalFloors, facing: i.optionalText('facing', 'Facing', 30), furnishing: plot ? null : i.optionalText('furnishing', 'Furnishing', 30),
      status, possession: status === 'UNDER_CONSTRUCTION' ? i.optionalMonth('possession', 'Possession') : null,
      amenities: i.list('amenities', 'Amenities'), listedBy: i.oneOf('listedBy', 'Listed by', Object.values(ListedBy)), localityId, projectId,
    };
  }

  /** The address of a listing never changes after this, so links and search results keep working when the title is edited. */
  private async freshSlug(title: string, taken = new Set<string>()) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const slug = `${slugify(title)}-${Math.floor(10_000 + Math.random() * 90_000)}`;
      if (!taken.has(slug) && !(await this.db.property.findUnique({ where: { slug }, select: { id: true } }))) { taken.add(slug); return slug; }
    }
    throw new ConflictException('Could not create a unique address for this listing; try again');
  }

  async createProperty(user: SessionUser, body: Record<string, unknown>) {
    if (!isStaff(user) && !user.emailVerified) throw new ForbiddenException('Confirm your email address before posting. We sent you a link; you can ask for a new one from your overview page.');
    const data = await this.propertyData(body);
    // What staff add is live at once; what an agent adds waits for approval.
    const created = await this.db.property.create({ data: { ...data, slug: await this.freshSlug(data.title), ownerId: user.id, state: isStaff(user) ? 'PUBLISHED' : 'PENDING' } });
    await this.trust.refreshProperty(created.id);
    return created;
  }
  async updateProperty(user: SessionUser, id: string, body: Record<string, unknown>) {
    await this.propertyRow(user, id);
    const data = await this.propertyData(body);
    // An agent's edit goes back for review, so changed text or price is never live unchecked.
    // A seller's change also withdraws our team's check of the home: what was checked is no longer what is listed.
    const updated = await this.db.property.update({ where: { id }, data: { ...data, ...(isStaff(user) ? {} : { state: 'PENDING' as const, rejectReason: null, staffVerified: false, staffVerifiedNote: null, staffVerifiedAt: null, staffVerifiedBy: null }) } });
    await this.trust.refreshProperty(id);
    return updated;
  }
  async deleteProperty(user: SessionUser, id: string) {
    const p = await this.propertyRow(user, id);
    await this.db.property.delete({ where: { id } });
    await Promise.all(p.photos.map((ph) => removePhoto(ph.file)));
    return { ok: true };
  }

  async review(id: string, body: Record<string, unknown>) {
    const i = new Input(body);
    const decision = i.oneOf('decision', 'Decision', ['approve', 'reject'] as const);
    if (!(await this.db.property.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Property not found');
    const updated = decision === 'approve'
      ? await this.db.property.update({ where: { id }, data: { state: 'PUBLISHED', rejectReason: null, postedAt: new Date() } })
      : await this.db.property.update({ where: { id }, data: { state: 'REJECTED', rejectReason: i.text('reason', 'Reason for rejecting', 300) } });
    // A seller's share of rejected listings is part of their confidence, so their level and listings are re-judged.
    if (updated.ownerId) await this.trust.refreshDealer(updated.ownerId); else await this.trust.refreshProperty(id);
    return updated;
  }

  // ---- Photos

  async addPhotos(user: SessionUser, propertyId: string, files: { buffer: Buffer; size: number }[]) {
    const p = await this.propertyRow(user, propertyId);
    if (!files?.length) throw new BadRequestException('Choose at least one photo');
    if (p.photos.length + files.length > MAX_PHOTOS_PER_LISTING) throw new BadRequestException(`A listing can have at most ${MAX_PHOTOS_PER_LISTING} photos; this one has ${p.photos.length}`);
    if (files.some((f) => !sniffImage(f.buffer))) throw new BadRequestException('Photos must be JPEG, PNG or WebP images');
    if (files.some((f) => f.size > MAX_PHOTO_BYTES)) throw new BadRequestException('Each photo must be under 5 MB');
    // Every file is decoded and resized before anything is stored, so one bad file rejects the whole upload cleanly.
    const processed: ProcessedPhoto[] = [];
    for (const f of files) {
      try { processed.push(await processPhoto(f.buffer)); } catch { throw new BadRequestException('One of the photos could not be read. Save it again as a JPEG or PNG and retry.'); }
    }
    const last = await this.db.photo.aggregate({ where: { propertyId }, _max: { position: true } });
    let position = (last._max.position ?? -1) + 1;
    for (const ph of processed) {
      const file = await savePhoto(ph);
      await this.db.photo.create({ data: { propertyId, file, width: ph.width, height: ph.height, position: position++ } });
    }
    if (!isStaff(user) && p.state === 'PUBLISHED') await this.db.property.update({ where: { id: propertyId }, data: { state: 'PENDING' } });
    await this.trust.refreshProperty(propertyId);
    return { ok: true, added: files.length };
  }

  async deletePhoto(user: SessionUser, photoId: string) {
    const photo = await this.db.photo.findFirst({ where: { id: photoId, property: this.scope(user) } });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.db.photo.delete({ where: { id: photoId } });
    await removePhoto(photo.file);
    await this.trust.refreshProperty(photo.propertyId);
    return { ok: true, propertyId: photo.propertyId };
  }

  // ---- Enquiries from buyers. Staff see all; an owner or agent sees those on their own listings.

  /** Staff may narrow to leads on projects, enquiries on single listings, or one project; an owner or agent only ever sees their own listings' enquiries. */
  private enquiryWhere(user: SessionUser, q: { kind?: string; project?: string }): Prisma.EnquiryWhereInput {
    if (user.role === 'BUILDER') return q.project ? { AND: [this.builderLeads(user), { projectId: q.project }] } : this.builderLeads(user);
    if (!isStaff(user)) return { property: { ownerId: user.id } };
    if (q.project) return { projectId: q.project };
    return q.kind === 'project' ? { propertyId: null } : q.kind === 'listing' ? { propertyId: { not: null } } : {};
  }

  /**
   * Each lead is followed up on two separate tracks: ours (staff) and the outside party's (the listing's seller or the
   * project's builder). This says which track an account works on, so neither side overwrites the other.
   */
  private track(user: SessionUser) {
    return isStaff(user)
      ? { party: 'STAFF' as const, status: 'status' as const, note: 'note' as const, at: 'statusAt' as const }
      : { party: 'PARTNER' as const, status: 'partnerStatus' as const, note: 'partnerNote' as const, at: 'partnerStatusAt' as const };
  }

  async enquiries(user: SessionUser, q: { page?: string; kind?: string; project?: string; status?: string }) {
    const scope = this.enquiryWhere(user, q);
    const t = this.track(user);
    const staff = isStaff(user);
    const status = Object.values(LeadStatus).includes(q.status as LeadStatus) ? (q.status as LeadStatus) : undefined;
    const where: Prisma.EnquiryWhereInput = status ? { AND: [scope, { [t.status]: status }] } : scope;
    const p = page(q.page);
    // How many leads are at each stage on this account's own track, for the filter tabs.
    const grouped = await this.db.enquiry.groupBy({ by: [t.status], where: scope, _count: true });
    const byStatus = Object.fromEntries(Object.values(LeadStatus).map((x) => [x, grouped.find((g) => g[t.status] === x)?._count ?? 0]));
    const [rows, total, project] = await Promise.all([
      this.db.enquiry.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * 50, take: 50,
        include: {
          property: { select: { id: true, slug: true, title: true, state: true, owner: { select: { name: true, role: true } } } },
          project: { select: { id: true, slug: true, name: true, account: { select: { name: true } } } },
          // A partner sees only their own trail; staff see both.
          events: { where: staff ? {} : { party: 'PARTNER' }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, party: true, fromStatus: true, toStatus: true, note: true, byName: true, createdAt: true } },
        },
      }),
      this.db.enquiry.count({ where }),
      q.project && user.role !== 'AGENT' ? this.db.project.findFirst({ where: { id: q.project, ...(user.role === 'BUILDER' ? { accountId: user.id } : {}) }, select: { id: true, name: true, builder: true } }) : null,
    ]);
    const items = rows.map((e) => {
      // Who the outside party is for this lead: a seller with their own account, else the project's builder login.
      const seller = e.property?.owner?.role === 'AGENT' ? e.property.owner.name : null;
      const partnerName = seller ?? e.project?.account?.name ?? null;
      return {
        id: e.id, name: e.name, phone: e.phone, email: e.email, message: e.message, interest: e.interest, createdAt: e.createdAt,
        property: e.property && { id: e.property.id, slug: e.property.slug, title: e.property.title, state: e.property.state },
        project: e.project && { id: e.project.id, slug: e.project.slug, name: e.project.name },
        status: e[t.status], note: e[t.note], events: e.events,
        // Staff also see how the seller or builder is getting on; the reverse is never sent.
        partner: staff && partnerName ? { kind: seller ? 'Seller' : 'Builder', name: partnerName, status: e.partnerStatus, note: e.partnerNote, at: e.partnerStatusAt } : null,
      };
    });
    return { items, total, page: p, pageSize: 50, project, byStatus };
  }

  /** Records where this account's follow-up stands, with a short private note, and adds the change to the lead's trail. */
  async updateEnquiry(user: SessionUser, id: string, body: Record<string, unknown>) {
    const i = new Input(body);
    const status = i.oneOf('status', 'Status', Object.values(LeadStatus));
    const note = i.optionalText('note', 'Note', 300);
    const t = this.track(user);
    const current = await this.db.enquiry.findFirst({ where: { AND: [this.enquiryWhere(user, {}), { id }] } });
    if (!current) throw new NotFoundException('Enquiry not found');
    const changedStatus = status !== current[t.status];
    if (!changedStatus && note === current[t.note]) return { id, status, note, changed: false };
    await this.db.$transaction([
      this.db.enquiry.update({ where: { id }, data: { [t.status]: status, [t.note]: note, ...(changedStatus ? { [t.at]: new Date() } : {}) } }),
      this.db.leadEvent.create({ data: { enquiryId: id, party: t.party, fromStatus: current[t.status], toStatus: status, note, byName: user.name, byUserId: user.id } }),
    ]);
    return { id, status, note, changed: true };
  }

  /** The same leads as a spreadsheet file. Staff get everything they filter for; a builder gets their own projects' leads. */
  async enquiriesCsv(user: SessionUser, q: { kind?: string; project?: string }) {
    const t = this.track(user);
    const staff = isStaff(user);
    const rows = await this.db.enquiry.findMany({
      where: this.enquiryWhere(user, q), orderBy: { createdAt: 'desc' }, take: 5000,
      include: { property: { select: { title: true } }, project: { select: { name: true } } },
    });
    // Quoted throughout; a leading apostrophe stops a spreadsheet from running a cell that starts like a formula.
    const cell = (v: string | null | undefined) => { const x = v ?? ''; return `"${(/^[=+\-@\t\r]/.test(x) ? `'${x}` : x).replace(/"/g, '""')}"`; };
    const lines = rows.map((e) => [e.createdAt.toISOString(), e.project?.name, e.property?.title, e.name, e.phone, e.email, e.interest, e.message, e[t.status], e[t.note], ...(staff ? [e.partnerStatus, e.partnerNote] : [])].map(cell).join(','));
    const header = ['received', 'project', 'listing', 'name', 'phone', 'email', 'interested_in', 'message', 'status', 'note', ...(staff ? ['seller_or_builder_status', 'seller_or_builder_note'] : [])];
    return [header.map((h) => `"${h}"`).join(','), ...lines].join('\r\n') + '\r\n';
  }

  // ---- Bulk import

  /** Checks every row first. Nothing is saved unless every row is valid, so a file is never half imported. */
  async importProperties(user: SessionUser, csv: unknown) {
    if (typeof csv !== 'string' || !csv.trim()) throw new BadRequestException('The file is empty');
    const rows = parseCsv(csv);
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const missing = IMPORT_COLUMNS.filter((c) => !header.includes(c));
    if (missing.length) throw new BadRequestException(`The first row must name the columns. Missing: ${missing.join(', ')}`);
    const body = rows.slice(1);
    if (!body.length) throw new BadRequestException('The file has a header but no listings');
    if (body.length > MAX_IMPORT_ROWS) throw new BadRequestException(`A file can hold at most ${MAX_IMPORT_ROWS} listings; this one has ${body.length}`);

    const cities = await this.db.city.findMany({ select: { name: true, localities: { select: { id: true, name: true, projects: { select: { id: true, name: true } } } } } });
    const key = (s: string) => s.trim().toLowerCase();
    const errors: { row: number; error: string }[] = [];
    const valid: Awaited<ReturnType<AdminService['propertyData']>>[] = [];
    for (const [n, cells] of body.entries()) {
      const cell = (c: (typeof IMPORT_COLUMNS)[number]) => (cells[header.indexOf(c)] ?? '').trim();
      try {
        const city = cities.find((c) => key(c.name) === key(cell('city')));
        if (!city) throw new BadRequestException(`City “${cell('city')}” is not one of: ${cities.map((c) => c.name).join(', ')}`);
        const locality = city.localities.find((l) => key(l.name) === key(cell('locality')));
        if (!locality) throw new BadRequestException(`Locality “${cell('locality')}” was not found in ${city.name}`);
        const project = cell('project') ? locality.projects.find((p) => key(p.name) === key(cell('project'))) : undefined;
        if (cell('project') && !project) throw new BadRequestException(`Project “${cell('project')}” was not found in ${locality.name}`);
        valid.push(await this.propertyData({
          title: cell('title'), description: cell('description'), type: cell('type').toUpperCase(), bhk: cell('bhk'), bathrooms: cell('bathrooms'), priceInr: cell('price_inr'), areaSqft: cell('area_sqft'),
          status: cell('status').toUpperCase(), possession: cell('possession'), floor: cell('floor'), totalFloors: cell('total_floors'), facing: cell('facing'), furnishing: cell('furnishing'),
          listedBy: cell('listed_by').toUpperCase(), amenities: cell('amenities').replace(/;/g, ','), localityId: locality.id, projectId: project?.id ?? '',
        }));
      } catch (e) {
        errors.push({ row: n + 2, error: e instanceof BadRequestException ? e.message : 'Could not read this row' }); // +2: the header is row 1
      }
    }
    if (errors.length) return { imported: 0, errors };
    const taken = new Set<string>();
    const data = [];
    for (const v of valid) data.push({ ...v, slug: await this.freshSlug(v.title, taken), ownerId: user.id, state: 'PUBLISHED' as const });
    await this.db.property.createMany({ data });
    const made = await this.db.property.findMany({ where: { slug: { in: data.map((d) => d.slug) } }, select: { id: true } });
    for (const m of made) await this.trust.refreshProperty(m.id);
    return { imported: data.length, errors: [] };
  }

  // ---- Projects

  projects() {
    return this.db.project.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, builder: true, status: true, account: { select: { name: true } }, locality: { select: { name: true, city: { select: { name: true } } } }, _count: { select: { properties: true, enquiries: true } } },
    });
  }
  async project(id: string) {
    const p = await this.db.project.findUnique({ where: { id }, include: { _count: { select: { enquiries: true } } } });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }
  private async projectData(body: Record<string, unknown>) {
    const i = new Input(body);
    const localityId = i.text('localityId', 'Locality');
    const locality = await this.db.locality.findUnique({ where: { id: localityId }, select: { name: true, city: { select: { name: true } } } });
    if (!locality) throw new BadRequestException('Choose a locality from the list');
    const status = i.oneOf('status', 'Status', Object.values(ConstructionStatus));
    const accountId = i.optionalText('accountId', 'Builder login');
    if (accountId && !(await this.db.user.findFirst({ where: { id: accountId, role: 'BUILDER' }, select: { id: true } }))) throw new BadRequestException('Choose a builder login from the list');
    const leadEmail = i.optionalText('leadEmail', 'Sales email for leads', 160);
    if (leadEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)) throw new BadRequestException('Enter a valid sales email, or leave it empty');
    return {
      locality,
      data: {
        name: i.text('name', 'Name', 120), builder: i.text('builder', 'Builder', 120), description: i.text('description', 'Description', 2000), status,
        possession: status === 'UNDER_CONSTRUCTION' ? i.optionalMonth('possession', 'Possession') : null, reraId: i.optionalText('reraId', 'RERA number', 80),
        totalUnits: i.optionalNumber('totalUnits', 'Total units', 1, 50_000), amenities: i.list('amenities', 'Amenities'), leadEmail: leadEmail ? normalEmail(leadEmail) : null, accountId, localityId,
      },
    };
  }
  async createProject(body: Record<string, unknown>) {
    const { data, locality } = await this.projectData(body);
    const slug = slugify(`${data.name} ${locality.name} ${locality.city.name}`);
    if (await this.db.project.findUnique({ where: { slug }, select: { id: true } })) throw new ConflictException('A project with this name already exists in that locality');
    return this.db.project.create({ data: { ...data, slug } });
  }
  async updateProject(id: string, body: Record<string, unknown>) {
    const current = await this.project(id);
    const { data } = await this.projectData(body);
    if (data.localityId !== current.localityId && (await this.db.property.count({ where: { projectId: id } }))) throw new ConflictException('This project has listings, so it cannot be moved to another locality');
    return this.db.project.update({ where: { id }, data });
  }
  /** Builder logins, for the "Builder login" choice on a project. */
  builders() { return this.db.user.findMany({ where: { role: 'BUILDER' }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, active: true } }); }

  /** Listings in the project are kept and simply stop being linked to it. */
  async deleteProject(id: string) {
    await this.project(id);
    await this.db.$transaction([this.db.property.updateMany({ where: { projectId: id }, data: { projectId: null } }), this.db.project.delete({ where: { id } })]);
    return { ok: true };
  }

  // ---- Localities

  localities() {
    return this.db.locality.findMany({
      orderBy: [{ city: { name: 'asc' } }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, city: { select: { slug: true, name: true } }, _count: { select: { properties: true, projects: true } } },
    });
  }
  async locality(id: string) {
    const l = await this.db.locality.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Locality not found');
    return l;
  }
  private placeData(i: Input) {
    return { lat: i.number('lat', 'Latitude', -90, 90, false), lng: i.number('lng', 'Longitude', -180, 180, false) };
  }
  async createLocality(body: Record<string, unknown>) {
    const i = new Input(body);
    const cityId = i.text('cityId', 'City');
    if (!(await this.db.city.findUnique({ where: { id: cityId }, select: { id: true } }))) throw new BadRequestException('Choose a city from the list');
    const name = i.text('name', 'Name', 80);
    const slug = slugify(name);
    if (!slug) throw new BadRequestException('Name must contain letters or numbers');
    if (slug === 'compare' || slug.includes('-vs-')) throw new BadRequestException('That name cannot be used for a locality'); // those addresses belong to the comparison pages
    if (await this.db.locality.findFirst({ where: { cityId, slug }, select: { id: true } })) throw new ConflictException('This city already has a locality with that name');
    return this.db.locality.create({ data: { cityId, name, slug, intro: i.text('intro', 'Introduction', 1000), highlights: i.list('highlights', 'Highlights', 8), ...this.placeData(i) } });
  }
  /** The city and the page address stay fixed; name, text and location can change. */
  async updateLocality(id: string, body: Record<string, unknown>) {
    await this.locality(id);
    const i = new Input(body);
    return this.db.locality.update({ where: { id }, data: { name: i.text('name', 'Name', 80), intro: i.text('intro', 'Introduction', 1000), highlights: i.list('highlights', 'Highlights', 8), ...this.placeData(i) } });
  }
  async deleteLocality(id: string) {
    await this.locality(id);
    const [properties, projects] = await Promise.all([this.db.property.count({ where: { localityId: id } }), this.db.project.count({ where: { localityId: id } })]);
    if (properties || projects) throw new ConflictException(`This locality still has ${properties} listings and ${projects} projects. Remove or move them first.`);
    await this.db.locality.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Cities

  cities() {
    return this.db.city.findMany({ orderBy: { name: 'asc' }, select: { id: true, slug: true, name: true, state: true, _count: { select: { localities: true } } } });
  }
  async city(id: string) {
    const c = await this.db.city.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('City not found');
    return c;
  }
  private cityData(i: Input) {
    const pct = (key: string, label: string) => { const v = i.optionalText(key, label); return v == null ? null : i.number(key, label, 0, 25, false); };
    const stampDutyPct = pct('stampDutyPct', 'Stamp duty');
    const registrationPct = pct('registrationPct', 'Registration fee');
    if ((stampDutyPct == null) !== (registrationPct == null)) throw new BadRequestException('Fill in both stamp duty and registration fee, or leave both empty');
    return {
      name: i.text('name', 'Name', 80), state: i.text('state', 'State', 80), intro: i.text('intro', 'Introduction', 1000), ...this.placeData(i),
      stampDutyPct, registrationPct, stampDutyWomenPct: pct('stampDutyWomenPct', 'Stamp duty for women buyers'),
      registrationCapInr: i.optionalNumber('registrationCapInr', 'Registration fee limit', 0, 10_000_000), costNote: i.optionalText('costNote', 'Note shown with the estimate', 400),
      // Ticking "I have checked these" stamps today's date; otherwise the previous review date is cleared, because the figures may have changed.
      costReviewedAt: i.optionalText('costReviewed', 'Reviewed') ? new Date() : null,
    };
  }
  async createCity(body: Record<string, unknown>) {
    const data = this.cityData(new Input(body));
    const slug = slugify(data.name);
    // City pages live at the top of the site (/pune), so a city cannot take the address of another section.
    if (!slug || ['ask', 'admin', 'api', 'media', 'projects', 'property', 'post-property', 'tools', 'compare', 'sitemap-xml', 'robots-txt'].includes(slug)) throw new BadRequestException('That name cannot be used for a city');
    if (await this.db.city.findUnique({ where: { slug }, select: { id: true } })) throw new ConflictException('A city with that name already exists');
    return this.db.city.create({ data: { ...data, slug } });
  }
  async updateCity(id: string, body: Record<string, unknown>) {
    await this.city(id);
    return this.db.city.update({ where: { id }, data: this.cityData(new Input(body)) });
  }
  async deleteCity(id: string) {
    await this.city(id);
    const localities = await this.db.locality.count({ where: { cityId: id } });
    if (localities) throw new ConflictException(`This city still has ${localities} localities. Remove them first.`);
    await this.db.city.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Questions buyers asked

  async questions(q: { only?: string; page?: string }) {
    const where: Prisma.QuestionWhereInput = q.only === 'empty' ? NO_EXACT_MATCH : {};
    const p = page(q.page);
    const [items, total, all, empty] = await Promise.all([
      this.db.question.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * 50, take: 50 }),
      this.db.question.count({ where }), this.db.question.count(), this.db.question.count({ where: NO_EXACT_MATCH }),
    ]);
    return { items, total, page: p, pageSize: 50, all, empty };
  }
}

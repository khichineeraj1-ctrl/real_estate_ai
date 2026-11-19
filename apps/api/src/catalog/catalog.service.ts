import { BAND_LABEL, intentInWords, readIntent, scoreLead } from '../leads/score';
import { displayName } from '../rera/parse';
import { builderFor } from './builders';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConstructionStatus, Prisma, PropertyType } from '@prisma/client';
import { Input } from '../admin/input';
import { Mailer, SITE_URL } from '../mail/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { SOURCE_NAME } from '../rera/parse';
import { LEVEL_LABEL, Level } from '../trust/confidence';
import { TrustService } from '../trust/trust.service';

export interface PropertyFilters {
  city?: string; // slugs
  locality?: string;
  project?: string;
  bhk?: number;
  type?: PropertyType;
  status?: ConstructionStatus;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  pageSize?: number;
}

const CARD = {
  slug: true, title: true, type: true, bhk: true, bathrooms: true, priceInr: true, areaSqft: true, status: true, possession: true, listedBy: true, postedAt: true,
  locality: { select: { slug: true, name: true, city: { select: { slug: true, name: true } } } },
  project: { select: { slug: true, name: true, builder: true, brand: { select: { slug: true, name: true } } } },
  photos: { select: { file: true }, orderBy: { position: 'asc' }, take: 1 }, // the cover photo
  confidence: true, // level 0-3; see src/trust
} satisfies Prisma.PropertySelect;

export type PropertyCard = Prisma.PropertyGetPayload<{ select: typeof CARD }>;

/** Government charges for a city, as sent to the site. */
const COSTS = { stampDutyPct: true, stampDutyWomenPct: true, registrationPct: true, registrationCapInr: true, costNote: true, costReviewedAt: true } satisfies Prisma.CitySelect;
export type CityCosts = Prisma.CityGetPayload<{ select: typeof COSTS }>;
const costsOf = (c: CityCosts) => (c.stampDutyPct == null || c.registrationPct == null ? null : {
  stampDutyPct: c.stampDutyPct, stampDutyWomenPct: c.stampDutyWomenPct ?? c.stampDutyPct, registrationPct: c.registrationPct, registrationCapInr: c.registrationCapInr,
  note: c.costNote, reviewedAt: c.costReviewedAt,
});

export interface Stats { count: number; minPrice: number | null; maxPrice: number | null; avgRate: number | null }

/** An agent who may be offered to buyers for a project: approved for it, with an account in good standing and a profile our team has verified. */
export const VERIFIED_SELLER = { status: 'APPROVED', user: { active: true, role: 'AGENT', phone: { not: null }, dealer: { status: 'APPROVED' } } } satisfies Prisma.ProjectSellerWhereInput;
/** Added to a project query to count its verified agents; `withAgents` turns the count into `agents`. */
const AGENT_COUNT = { select: { sellers: { where: VERIFIED_SELLER } } } as const;
/** The first photo of a project, for its card. */
const COVER = { orderBy: { position: 'asc' }, take: 1, select: { file: true } } as const;
const withAgents = <T extends { _count: { sellers: number } }>({ _count, ...p }: T) => ({ ...p, agents: _count.sellers });

@Injectable()
export class CatalogService {
  constructor(private readonly db: PrismaService, private readonly mail: Mailer, private readonly trust: TrustService) {}

  private where(f: PropertyFilters): Prisma.PropertyWhereInput {
    return {
      state: 'PUBLISHED', // listings waiting for approval, or rejected, never reach the public site
      ...(f.bhk != null ? { bhk: f.bhk } : {}),
      ...(f.type ? { type: f.type } : {}),
      ...(f.status ? { status: f.status } : {}),
      ...(f.project ? { project: { slug: f.project } } : {}),
      ...(f.minPrice != null || f.maxPrice != null ? { priceInr: { ...(f.minPrice != null ? { gte: f.minPrice } : {}), ...(f.maxPrice != null ? { lte: f.maxPrice } : {}) } } : {}),
      ...(f.city || f.locality ? { locality: { ...(f.locality ? { slug: f.locality } : {}), ...(f.city ? { city: { slug: f.city } } : {}) } } : {}),
    };
  }

  /** Count, price range and average asking rate (₹ per sq ft) for whatever the filters match. */
  async stats(f: PropertyFilters): Promise<Stats> {
    const a = await this.db.property.aggregate({ where: this.where(f), _count: true, _min: { priceInr: true }, _max: { priceInr: true }, _sum: { priceInr: true, areaSqft: true } });
    const area = a._sum.areaSqft ?? 0;
    return { count: a._count, minPrice: a._min.priceInr, maxPrice: a._max.priceInr, avgRate: area ? Math.round(Number(a._sum.priceInr ?? 0) / area) : null };
  }

  async list(f: PropertyFilters) {
    const pageSize = Math.min(Math.max(f.pageSize ?? 12, 1), 48);
    const page = Math.max(f.page ?? 1, 1);
    const where = this.where(f);
    const orderBy: Prisma.PropertyOrderByWithRelationInput[] = f.sort === 'price_asc' ? [{ priceInr: 'asc' }] : f.sort === 'price_desc' ? [{ priceInr: 'desc' }]
      // Unless the buyer asked for a price order, homes we have more confidence in come first, newest first within each level.
      : f.sort === 'newest' ? [{ postedAt: 'desc' }] : [{ confidence: 'desc' }, { postedAt: 'desc' }];
    const [items, stats] = await Promise.all([
      this.db.property.findMany({ where, select: CARD, orderBy: [...orderBy, { slug: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.stats(f),
    ]);
    return { items, total: stats.count, page, pageSize, stats };
  }

  /** How many homes of each size the filters match; drives the "2 BHK / 3 BHK" links on listing pages. */
  async bhkBreakdown(f: PropertyFilters) {
    const rows = await this.db.property.groupBy({ by: ['bhk'], where: { ...this.where({ ...f, bhk: undefined }), bhk: { gt: 0 } }, _count: true, _min: { priceInr: true }, orderBy: { bhk: 'asc' } });
    return rows.map((r) => ({ bhk: r.bhk, count: r._count, minPrice: r._min.priceInr }));
  }

  async cities() {
    const cities = await this.db.city.findMany({ orderBy: { name: 'asc' }, include: { localities: { select: { slug: true, name: true }, orderBy: { name: 'asc' } } } });
    return Promise.all(cities.map(async ({ stampDutyPct, stampDutyWomenPct, registrationPct, registrationCapInr, costNote, costReviewedAt, ...c }) => ({
      ...c, costs: costsOf({ stampDutyPct, stampDutyWomenPct, registrationPct, registrationCapInr, costNote, costReviewedAt }), stats: await this.stats({ city: c.slug }),
    })));
  }

  async city(slug: string) {
    const city = await this.db.city.findUnique({ where: { slug }, include: { localities: { orderBy: { name: 'asc' } } } });
    if (!city) throw new NotFoundException('City not found');
    const [stats, bhk, localities, projects] = await Promise.all([
      this.stats({ city: slug }),
      this.bhkBreakdown({ city: slug }),
      Promise.all(city.localities.map(async (l) => ({ slug: l.slug, name: l.name, stats: await this.stats({ city: slug, locality: l.slug }) }))),
      // Projects entered by our team or builders first, then register entries; a city can have hundreds, so only the first few dozen are listed here.
      this.db.project.findMany({ where: { locality: { city: { slug } } }, select: { slug: true, name: true, builder: true, brand: { select: { slug: true, name: true } }, status: true, registerSource: true, locality: { select: { name: true } }, photos: COVER, _count: AGENT_COUNT }, orderBy: [{ registerSource: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }], take: 36 }),
    ]);
    return { slug: city.slug, name: city.name, state: city.state, intro: city.intro, lat: city.lat, lng: city.lng, costs: costsOf(city), stats, bhk, localities, projects: projects.map(withAgents), builders: await this.buildersIn(slug) };
  }

  /** The builders with projects in a city, busiest first: the links from a city page to each builder's page there. */
  private async buildersIn(citySlug: string, take = 30) {
    const rows = await this.db.project.groupBy({ by: ['brandId'], where: { brandId: { not: null }, locality: { city: { slug: citySlug } } }, _count: true });
    const names = new Map((await this.db.builder.findMany({ where: { id: { in: rows.map((r) => r.brandId!) } }, select: { id: true, slug: true, name: true } })).map((b) => [b.id, b]));
    const all = rows.map((r) => ({ slug: names.get(r.brandId!)!.slug, name: names.get(r.brandId!)!.name, projects: r._count })).sort((a, b) => b.projects - a.projects || a.name.localeCompare(b.name));
    return { total: all.length, top: all.slice(0, take) };
  }

  async locality(citySlug: string, slug: string) {
    const locality = await this.db.locality.findFirst({ where: { slug, city: { slug: citySlug } }, include: { city: true } });
    if (!locality) throw new NotFoundException('Locality not found');
    const f = { city: citySlug, locality: slug };
    const [stats, bhk, projects, siblings] = await Promise.all([
      this.stats(f),
      this.bhkBreakdown(f),
      this.db.project.findMany({ where: { localityId: locality.id }, select: { slug: true, name: true, builder: true, brand: { select: { slug: true, name: true } }, status: true, registerSource: true, photos: COVER, _count: AGENT_COUNT }, orderBy: [{ registerSource: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }], take: 60 }),
      this.db.locality.findMany({ where: { cityId: locality.cityId, NOT: { id: locality.id } }, select: { slug: true, name: true, lat: true, lng: true } }),
    ]);
    // Nearest first, so "nearby localities" links are the ones a buyer would actually compare.
    const nearby = siblings.map((s) => ({ slug: s.slug, name: s.name, d: (s.lat - locality.lat) ** 2 + (s.lng - locality.lng) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 4).map(({ slug, name }) => ({ slug, name }));
    return {
      slug: locality.slug, name: locality.name, intro: locality.intro, highlights: locality.highlights, lat: locality.lat, lng: locality.lng,
      city: { slug: locality.city.slug, name: locality.city.name, state: locality.city.state }, stats, bhk, projects: projects.map(withAgents), nearby,
    };
  }

  async project(slug: string) {
    const project = await this.db.project.findUnique({ where: { slug }, include: { locality: { include: { city: true } }, brand: { select: { slug: true, name: true } }, photos: { orderBy: { position: 'asc' }, select: { file: true, width: true, height: true, category: true } } } });
    if (!project) throw new NotFoundException('Project not found');
    const [properties, stats, bhk] = await Promise.all([
      this.db.property.findMany({ where: { projectId: project.id, state: 'PUBLISHED' }, select: CARD, orderBy: { priceInr: 'asc' } }),
      this.stats({ project: slug }),
      this.bhkBreakdown({ project: slug }),
    ]);
    const { locality, localityId, id, leadEmail, accountId, brandId, ...rest } = project;
    // Other projects a reader of this one is likely to want next: the same builder in this city, and the same locality.
    const link = { slug: true, name: true, builder: true, brand: { select: { slug: true, name: true } }, locality: { select: { name: true } }, photos: COVER, _count: AGENT_COUNT } as const;
    const [byBuilder, inLocality] = await Promise.all([
      brandId ? this.db.project.findMany({ where: { brandId, id: { not: id }, locality: { cityId: locality.cityId } }, select: link, orderBy: { name: 'asc' }, take: 8 }) : [],
      this.db.project.findMany({ where: { localityId, id: { not: id }, ...(brandId ? { NOT: { brandId } } : {}) }, select: link, orderBy: { name: 'asc' }, take: 8 }),
    ]);
    const registerName = project.registerSource ? SOURCE_NAME[project.registerSource] : null; // the builder's sales address and login are for our use only
    return { ...rest, registerName, locality: { slug: locality.slug, name: locality.name, lat: locality.lat, lng: locality.lng }, city: { slug: locality.city.slug, name: locality.city.name, state: locality.city.state }, properties, stats, bhk, more: { byBuilder: byBuilder.map(withAgents), inLocality: inLocality.map(withAgents) }, agents: await this.projectAgents(id) };
  }

  async property(slug: string) {
    const p = await this.db.property.findFirst({
      where: { slug, state: 'PUBLISHED' },
      include: { locality: { include: { city: true } }, project: { select: { slug: true, name: true, builder: true, reraId: true, brand: { select: { slug: true, name: true } } } }, photos: { select: { file: true, width: true, height: true, category: true }, orderBy: { position: 'asc' } }, owner: { select: { role: true, active: true, phone: true, dealer: { select: { kind: true } } } } },
    });
    if (!p) throw new NotFoundException('Property not found');
    const similar = await this.db.property.findMany({
      where: { state: 'PUBLISHED', localityId: p.localityId, NOT: { id: p.id }, ...(p.bhk ? { bhk: { in: [p.bhk - 1, p.bhk, p.bhk + 1] } } : {}) },
      select: CARD, orderBy: [{ confidence: 'desc' }, { postedAt: 'desc' }], take: 4,
    });
    // Staff's working notes and names stay inside; buyers get the level, the reasons, and the seller's public card.
    const { locality, localityId, projectId, id, ownerId, state, rejectReason, staffVerifiedNote, staffVerifiedBy, confidence, owner, ...rest } = p;
    const sellerId = ownerId && p.owner?.role === 'AGENT' ? ownerId : null;
    return {
      ...rest,
      confidence: await this.trust.property(id),
      seller: sellerId ? await this.trust.publicDealer(sellerId) : null,
      // What the form on the page does: 'seller' shows an owner's or agent's contact once the buyer enquires; 'callback' takes a lead.
      contact: this.revealsSeller(p.owner) ? 'seller' as const : 'callback' as const,
      locality: { slug: locality.slug, name: locality.name, lat: locality.lat, lng: locality.lng, highlights: locality.highlights },
      city: { slug: locality.city.slug, name: locality.city.name, state: locality.city.state },
      costs: costsOf(locality.city),
      localityStats: await this.stats({ city: locality.city.slug, locality: locality.slug }),
      similar,
    };
  }

  /** Up to four listings in full, in the order asked for, for the side-by-side comparison. Unknown or unpublished ones are left out. */
  async compare(slugs: string[]) {
    const wanted = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))].slice(0, 4);
    const found = await Promise.all(wanted.map((s) => this.property(s).catch(() => null)));
    return found.filter((p): p is NonNullable<typeof p> => p !== null).map(({ similar, ...p }) => p);
  }

  /** Names the question parser and the assistant match against. Small enough to read on every question. */
  async gazetteer() {
    const cities = await this.db.city.findMany({ select: { slug: true, name: true, localities: { select: { slug: true, name: true } } } });
    return cities;
  }

  /**
   * A buyer asks to be contacted about a listing. The enquiry is saved for the seller and our team, the seller is
   * emailed, and the buyer gets the seller's name and phone in return (or is told our team will call, for listings
   * that have no seller account).
   */
  /** Where a project's leads are emailed: its sales address, or failing that the builder login assigned to it. */
  private leadAddress(project: { leadEmail: string | null; account: { email: string; active: boolean } | null }) {
    return project.leadEmail ?? (project.account?.active ? project.account.email : null);
  }

  private buyer(body: Record<string, unknown>) {
    const i = new Input(body);
    const name = i.text('name', 'Your name', 80);
    const phone = i.text('phone', 'Phone', 20).replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,13}$/.test(phone)) throw new BadRequestException('Enter a phone number with 10 to 13 digits');
    const email = i.optionalText('email', 'Email', 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid email address, or leave it empty');
    return { name, phone, email, message: i.optionalText('message', 'Message', 500), interest: i.optionalText('interest', 'Interested in', 40) };
  }

  /**
   * A lead on a builder project. Unlike a listing enquiry, nobody's phone number is shown to the buyer: the lead is
   * kept for our team and, when the project has a sales address, emailed to the builder.
   */
  /**
   * An owner or agent who posted a home is shown to the buyer who enquires, so the two can talk directly. A builder's
   * stock, and anything our team added, takes a lead instead: the buyer is called back and no number is shown.
   */
  private revealsSeller(owner: { role: string; active: boolean; phone: string | null; dealer: { kind: string } | null } | null) {
    return !!owner && owner.active && owner.role === 'AGENT' && !!owner.phone && owner.dealer?.kind !== 'BUILDER';
  }

  /** The verified agents selling a project, as buyers see them: name, firm and how far we have verified them. Never a phone number. */
  private async projectAgents(projectId: string) {
    const rows = await this.db.projectSeller.findMany({ where: { projectId, ...VERIFIED_SELLER }, select: { user: { select: { id: true, name: true, dealer: { select: { firmName: true, yearsInBusiness: true, level: true, kind: true } } } } }, orderBy: { decidedAt: 'asc' } });
    return rows.map(({ user: u }) => ({ id: u.id, name: u.name, firmName: u.dealer?.firmName ?? null, yearsInBusiness: u.dealer?.yearsInBusiness ?? null, level: u.dealer?.level ?? 0, label: LEVEL_LABEL[(u.dealer?.level ?? 0) as Level] }))
      .sort((a, b) => b.level - a.level);
  }

  /**
   * Which of a project's verified agents the next lead goes to: the one who has been passed the fewest in the last
   * thirty days, so leads are shared out; between equals, the one we have verified most fully.
   */
  private async nextAgent(projectId: string) {
    const sellers = await this.db.projectSeller.findMany({ where: { projectId, ...VERIFIED_SELLER }, select: { user: { select: { id: true, name: true, phone: true, email: true, dealer: { select: { firmName: true, level: true } } } } } });
    if (!sellers.length) return null;
    const recent = await this.db.enquiry.groupBy({ by: ['assignedToId'], where: { assignedToId: { in: sellers.map((x) => x.user.id) }, createdAt: { gt: new Date(Date.now() - 30 * 86_400_000) } }, _count: true });
    const had = new Map(recent.map((r) => [r.assignedToId, r._count]));
    return sellers.map((x) => x.user).sort((a, b) => (had.get(a.id) ?? 0) - (had.get(b.id) ?? 0) || (b.dealer?.level ?? 0) - (a.dealer?.level ?? 0) || a.name.localeCompare(b.name))[0];
  }
  /** Tells the agent about a lead passed to them, and gives what the buyer is shown in return. */
  private async handOver(agent: NonNullable<Awaited<ReturnType<CatalogService['nextAgent']>>>, about: string, b: { name: string; phone: string; email: string | null; message: string | null }, summary: string) {
    await this.mail.send({
      to: agent.email, subject: `New lead: ${about}`,
      text: `Hello ${agent.name},\n\nA buyer asked to be connected to a verified agent for ${about}, and the lead is yours.\n\nName: ${b.name}\nPhone: ${b.phone}${b.email ? `\nEmail: ${b.email}` : ''}${b.message ? `\nMessage: ${b.message}` : ''}${summary}\n\nThe buyer has been shown your name and phone number. Please call them today, and record how it goes: ${SITE_URL}/admin/enquiries`,
    });
    const level = agent.dealer?.level ?? 0;
    return { name: agent.name, phone: agent.phone!, firmName: agent.dealer?.firmName ?? null, level, label: LEVEL_LABEL[level as Level] };
  }

  /** The buyer's stated plans and site use, and the score they add up to, ready to store with the enquiry. */
  private async intent(body: Record<string, unknown>, b: { name: string; phone: string; email: string | null; message: string | null }, about: { projectId?: string | null; propertyId?: string }) {
    const i = readIntent(body);
    const [earlierHere, lastDay] = await Promise.all([
      this.db.enquiry.count({ where: { phone: b.phone, ...(about.propertyId ? { propertyId: about.propertyId } : { projectId: about.projectId ?? undefined, propertyId: null }) } }),
      this.db.enquiry.count({ where: { phone: b.phone, createdAt: { gt: new Date(Date.now() - 24 * 3600 * 1000) } } }),
    ]);
    const scored = scoreLead({ ...b, ...i, earlierHere, lastDay });
    const data = { timeline: i.timeline, budget: i.budget, loan: i.loan, purpose: i.purpose, wantsVisit: i.wantsVisit, signals: i.signals ? (i.signals as unknown as Prisma.InputJsonValue) : Prisma.JsonNull, score: scored.score, scoreBand: scored.band, scoreReasons: scored.reasons as unknown as Prisma.InputJsonValue };
    // For the email to whoever follows the lead up: how strong it looks and what the buyer said.
    const summary = `\n\nLead strength: ${BAND_LABEL[scored.band]} (${scored.score} of 100)${intentInWords(i).length ? `\n${intentInWords(i).join('\n')}` : ''}${scored.reasons.filter((r) => r.points > 0).length ? `\nWhy: ${scored.reasons.filter((r) => r.points > 0).slice(0, 4).map((r) => r.text).join('; ')}` : ''}`;
    return { data, summary };
  }

  async enquireProject(slug: string, body: Record<string, unknown>) {
    const b = this.buyer(body);
    const project = await this.db.project.findUnique({ where: { slug }, select: { id: true, name: true, leadEmail: true, account: { select: { email: true, active: true } }, locality: { select: { name: true, city: { select: { name: true } } } } } });
    if (!project) throw new NotFoundException('Project not found');
    const intent = await this.intent(body, b, { projectId: project.id });
    // "Connect with a verified agent": the lead goes to one of the project's agents, who is shown to the buyer.
    const agent = body.via === 'agent' ? await this.nextAgent(project.id) : null;
    await this.db.enquiry.create({ data: { projectId: project.id, ...b, ...intent.data, assignedToId: agent?.id ?? null } });
    if (agent) return { ok: true, agent: await this.handOver(agent, `${project.name}, ${project.locality.name}`, b, intent.summary) };
    const to = this.leadAddress(project);
    if (to) {
      await this.mail.send({
        to, subject: `New lead: ${project.name}, ${project.locality.name}`,
        text: `A buyer asked about ${project.name} in ${project.locality.name}, ${project.locality.city.name}.\n\nName: ${b.name}\nPhone: ${b.phone}${b.email ? `\nEmail: ${b.email}` : ''}${b.interest ? `\nInterested in: ${b.interest}` : ''}${b.message ? `\nMessage: ${b.message}` : ''}\n\nThe buyer agreed to be contacted about this project.${intent.summary}`,
      });
    }
    return { ok: true };
  }

  async enquire(slug: string, body: Record<string, unknown>) {
    const b = this.buyer(body);
    const { name, phone, email, message } = b;
    const p = await this.db.property.findFirst({ where: { slug, state: 'PUBLISHED' }, select: { id: true, title: true, projectId: true, ownerId: true, project: { select: { name: true, leadEmail: true, account: { select: { email: true, active: true } } } }, owner: { select: { name: true, phone: true, email: true, role: true, active: true, dealer: { select: { kind: true } } } } } });
    if (!p) throw new NotFoundException('Property not found');
    const intent = await this.intent(body, b, { propertyId: p.id });
    const enquiry = await this.db.enquiry.create({ data: { propertyId: p.id, projectId: p.projectId, name, phone, email, message, ...intent.data }, select: { id: true } });
    // An owner's or agent's contact is shown to the buyer; a builder who posted the home gets the lead without being shown.
    const seller = this.revealsSeller(p.owner) ? p.owner : null;
    const builderOwner = !seller && p.owner?.active && p.owner.dealer?.kind === 'BUILDER' ? p.owner : null;
    if (builderOwner) {
      await this.mail.send({ to: builderOwner.email, subject: `New lead: ${p.title}`, text: `Hello ${builderOwner.name},\n\nA buyer asked for a call back about "${p.title}".\n\nName: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}${message ? `\nMessage: ${message}` : ''}${intent.summary}\n\nAll your leads: ${SITE_URL}/admin/enquiries` });
    }
    if (seller) {
      await this.mail.send({
        to: seller.email, subject: `New enquiry: ${p.title}`,
        text: `Hello ${seller.name},\n\n${name} is interested in your listing "${p.title}".\n\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}${message ? `\nMessage: ${message}` : ''}${intent.summary}\n\nAll your enquiries: ${SITE_URL}/admin/enquiries`,
      });
    }
    // A listing with no seller account that belongs to a builder project is the builder's own stock: the lead goes to their sales address.
    // A builder's or our own listing inside a project, when the buyer asked for a verified agent: pass it to one.
    const agent = !seller && !builderOwner && body.via === 'agent' && p.projectId ? await this.nextAgent(p.projectId) : null;
    if (agent) {
      await this.db.enquiry.update({ where: { id: enquiry.id }, data: { assignedToId: agent.id } });
      return { ok: true, seller: null, agent: await this.handOver(agent, `"${p.title}"`, b, intent.summary) };
    }
    const builderAddress = p.project ? this.leadAddress(p.project) : null;
    if (!seller && !builderOwner && builderAddress) {
      await this.mail.send({
        to: builderAddress, subject: `New lead: ${p.project?.name ?? p.title}`,
        text: `A buyer asked about "${p.title}".\n\nName: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}${message ? `\nMessage: ${message}` : ''}${intent.summary}\n\nThe buyer agreed to be contacted about this home.`,
      });
    }
    const sellerLevel = seller && p.ownerId ? (await this.trust.dealer(p.ownerId)).level : null;
    return { ok: true, seller: seller ? { name: seller.name, phone: seller.phone, level: sellerLevel, label: LEVEL_LABEL[(sellerLevel ?? 0) as Level] } : null };
  }

  logQuestion(data: { text: string; live: boolean; total: number; relaxed: string | null; page: string | null }) {
    return this.db.question.create({ data });
  }

  /** Every builder that has at least one project, with how many and where. */
  async builders() {
    const rows = await this.db.builder.findMany({
      where: { projects: { some: {} } }, orderBy: { name: 'asc' },
      select: { slug: true, name: true, projects: { select: { locality: { select: { city: { select: { slug: true, name: true } } } } } } },
    });
    return rows.map((b) => ({ slug: b.slug, name: b.name, projects: b.projects.length, cities: [...new Map(b.projects.map((p) => [p.locality.city.slug, p.locality.city])).values()].sort((x, y) => x.name.localeCompare(y.name)) }));
  }

  /**
   * Register entries we hold but have not turned into a project page (they are outside the localities we cover), by
   * city and builder. They are real registered projects, so a builder's page can name them, and they count towards
   * whether the page has enough on it to be worth showing in search.
   */
  private async unplacedByBuilder(source?: 'HARYANA' | 'KARNATAKA' | 'MAHARASHTRA') {
    const rows = await this.db.registerProject.findMany({ where: { projectId: null, ...(source ? { source } : {}) }, select: { source: true, name: true, promoter: true, district: true, locationText: true, regNo: true, registerStatus: true, validUntil: true, sourceUrl: true } });
    const cityOf = (r: { source: string; district: string }) => (r.source === 'HARYANA' ? 'gurgaon' : r.source === 'KARNATAKA' ? 'bengaluru' : /pune/i.test(r.district) ? 'pune' : /mumbai|thane/i.test(r.district) ? 'mumbai' : null);
    const out = new Map<string, typeof rows>();
    for (const r of rows) {
      const city = cityOf(r); const promoter = displayName(r.promoter);
      if (!city || !promoter) continue;
      const key = `${city}/${builderFor(promoter).slug}`;
      (out.get(key) ?? out.set(key, []).get(key)!).push(r);
    }
    return out;
  }
  /** A builder's page in a city is offered to search engines only when it says more than a single project's own page does. */
  private worthIndexing(projects: number, homes: number, alsoRegistered: number) { return projects + alsoRegistered >= 2 || homes > 0; }

  /** One builder's page: its projects, and the company names they are registered under. */
  async builder(slug: string, city?: string) {
    const b = await this.db.builder.findUnique({
      where: { slug },
      select: {
        slug: true, name: true, mergedInto: { select: { slug: true } },
        projects: {
          orderBy: [{ name: 'asc' }],
          select: { slug: true, name: true, builder: true, status: true, reraId: true, registerSource: true, registerStatus: true, registerValidUntil: true, locality: { select: { slug: true, name: true, city: { select: { slug: true, name: true } } } }, photos: COVER, _count: { select: { properties: { where: { state: 'PUBLISHED' } }, sellers: { where: VERIFIED_SELLER } } } },
        },
      },
    });
    if (b?.mergedInto) return { movedTo: b.mergedInto.slug }; // merged into another builder: the page sends people there
    if (!b || !b.projects.length) throw new NotFoundException('Builder not found');
    const projects = b.projects.map(({ _count, locality, ...p }) => ({ ...p, homes: _count.properties, agents: _count.sellers, locality: { slug: locality.slug, name: locality.name }, city: locality.city }));
    const cities = [...new Map(projects.map((p) => [p.city.slug, p.city])).values()].sort((x, y) => x.name.localeCompare(y.name));
    // In one city: only that city's projects, and a 404 if the builder has none there.
    const shown = city ? projects.filter((p) => p.city.slug === city) : projects;
    if (!shown.length) throw new NotFoundException('Builder not found');
    // Other projects the register lists for this builder in the city, which we have no page for.
    const SOURCE = { gurgaon: 'HARYANA', bengaluru: 'KARNATAKA', mumbai: 'MAHARASHTRA', pune: 'MAHARASHTRA' } as const;
    const unplaced = city && city in SOURCE ? (await this.unplacedByBuilder(SOURCE[city as keyof typeof SOURCE])).get(`${city}/${b.slug}`) ?? [] : [];
    const alsoRegistered = unplaced.sort((x, y) => x.name.localeCompare(y.name)).slice(0, 40).map((r) => ({ name: displayName(r.name), location: displayName(r.locationText), regNo: r.regNo, status: r.registerStatus, validUntil: r.validUntil, sourceUrl: r.sourceUrl, registerName: SOURCE_NAME[r.source] }));
    const indexable = this.worthIndexing(shown.length, shown.reduce((n, p) => n + p.homes, 0), unplaced.length);
    return { slug: b.slug, name: b.name, registeredAs: [...new Set(shown.map((p) => p.builder))].sort(), cities, projects: shown, alsoRegistered, alsoRegisteredTotal: unplaced.length, indexable };
  }

  async sitemap() {
    const [cities, properties, projects] = await Promise.all([
      this.db.city.findMany({ select: { slug: true, localities: { select: { slug: true } } } }),
      this.db.property.findMany({ where: { state: 'PUBLISHED' }, select: { slug: true, postedAt: true } }),
      this.db.project.findMany({ select: { slug: true, brand: { select: { slug: true } }, locality: { select: { city: { select: { slug: true } } } } } }),
    ]);
    // Every project with its address parts, and from those each builder-in-a-city page.
    const placed = projects.filter((p) => p.brand).map((p) => ({ slug: p.slug, city: p.locality.city.slug, builder: p.brand!.slug }));
    // A builder's page in a city is listed only when it has more to say than one project's own page (see worthIndexing).
    const unplaced = await this.unplacedByBuilder();
    const perPage = new Map<string, number>();
    for (const p of placed) perPage.set(`${p.city}/${p.builder}`, (perPage.get(`${p.city}/${p.builder}`) ?? 0) + 1);
    const builderCities = [...new Map(placed.map((p) => [`${p.city}/${p.builder}`, { city: p.city, builder: p.builder }])).values()]
      .filter((b) => this.worthIndexing(perPage.get(`${b.city}/${b.builder}`) ?? 0, 0, unplaced.get(`${b.city}/${b.builder}`)?.length ?? 0));
    const perBuilder = new Map<string, Set<string>>();
    for (const b of builderCities) (perBuilder.get(b.builder) ?? perBuilder.set(b.builder, new Set()).get(b.builder)!).add(b.city);
    // A builder working in several cities also has one page that brings them together.
    const builders = [...perBuilder].filter(([, c]) => c.size > 1).map(([slug]) => ({ slug }));
    const configs = await this.db.property.groupBy({ by: ['localityId', 'bhk'], where: { state: 'PUBLISHED', bhk: { gt: 0 } }, _count: true });
    const locs = await this.db.locality.findMany({ select: { id: true, slug: true, lat: true, lng: true, cityId: true, city: { select: { slug: true } } } });
    // Each locality paired with its two nearest neighbours in the same city, written alphabetically so every pair has one address.
    // A comparison is only listed once at least one side has a home, since without homes there are no prices to compare.
    const withHomes = new Set((await this.db.property.groupBy({ by: ['localityId'], where: { state: 'PUBLISHED' }, _count: true })).map((g) => g.localityId));
    const pairs = new Set<string>();
    for (const a of locs) {
      const near = locs.filter((b) => b.cityId === a.cityId && b.id !== a.id).map((b) => ({ b, d: (b.lat - a.lat) ** 2 + (b.lng - a.lng) ** 2 })).sort((x, y) => x.d - y.d).slice(0, 2);
      for (const { b } of near) if (withHomes.has(a.id) || withHomes.has(b.id)) pairs.add(`${a.city.slug}/${[a.slug, b.slug].sort().join('-vs-')}`);
    }
    const byId = new Map(locs.map((l) => [l.id, l]));
    return {
      cities: cities.map((c) => ({ slug: c.slug, localities: c.localities.map((l) => l.slug) })),
      configs: configs.map((c) => ({ city: byId.get(c.localityId)!.city.slug, locality: byId.get(c.localityId)!.slug, bhk: c.bhk, count: c._count })),
      comparisons: [...pairs].sort().map((p) => { const [city, pair] = p.split('/'); return { city, pair }; }),
      properties, projects: placed, builderCities, builders,
    };
  }
}

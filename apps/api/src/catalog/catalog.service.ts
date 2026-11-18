import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConstructionStatus, Prisma, PropertyType } from '@prisma/client';
import { Input } from '../admin/input';
import { Mailer, SITE_URL } from '../mail/mailer';
import { PrismaService } from '../prisma/prisma.service';

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
  project: { select: { slug: true, name: true, builder: true } },
  photos: { select: { file: true }, orderBy: { position: 'asc' }, take: 1 }, // the cover photo
} satisfies Prisma.PropertySelect;

export type PropertyCard = Prisma.PropertyGetPayload<{ select: typeof CARD }>;

export interface Stats { count: number; minPrice: number | null; maxPrice: number | null; avgRate: number | null }

@Injectable()
export class CatalogService {
  constructor(private readonly db: PrismaService, private readonly mail: Mailer) {}

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
    const orderBy: Prisma.PropertyOrderByWithRelationInput[] = f.sort === 'price_asc' ? [{ priceInr: 'asc' }] : f.sort === 'price_desc' ? [{ priceInr: 'desc' }] : [{ postedAt: 'desc' }];
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
    return Promise.all(cities.map(async (c) => ({ ...c, stats: await this.stats({ city: c.slug }) })));
  }

  async city(slug: string) {
    const city = await this.db.city.findUnique({ where: { slug }, include: { localities: { orderBy: { name: 'asc' } } } });
    if (!city) throw new NotFoundException('City not found');
    const [stats, bhk, localities, projects] = await Promise.all([
      this.stats({ city: slug }),
      this.bhkBreakdown({ city: slug }),
      Promise.all(city.localities.map(async (l) => ({ slug: l.slug, name: l.name, stats: await this.stats({ city: slug, locality: l.slug }) }))),
      this.db.project.findMany({ where: { locality: { city: { slug } } }, select: { slug: true, name: true, builder: true, status: true, locality: { select: { name: true } } }, orderBy: { name: 'asc' } }),
    ]);
    return { slug: city.slug, name: city.name, state: city.state, intro: city.intro, lat: city.lat, lng: city.lng, stats, bhk, localities, projects };
  }

  async locality(citySlug: string, slug: string) {
    const locality = await this.db.locality.findFirst({ where: { slug, city: { slug: citySlug } }, include: { city: true } });
    if (!locality) throw new NotFoundException('Locality not found');
    const f = { city: citySlug, locality: slug };
    const [stats, bhk, projects, siblings] = await Promise.all([
      this.stats(f),
      this.bhkBreakdown(f),
      this.db.project.findMany({ where: { localityId: locality.id }, select: { slug: true, name: true, builder: true, status: true }, orderBy: { name: 'asc' } }),
      this.db.locality.findMany({ where: { cityId: locality.cityId, NOT: { id: locality.id } }, select: { slug: true, name: true, lat: true, lng: true } }),
    ]);
    // Nearest first, so "nearby localities" links are the ones a buyer would actually compare.
    const nearby = siblings.map((s) => ({ slug: s.slug, name: s.name, d: (s.lat - locality.lat) ** 2 + (s.lng - locality.lng) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 4).map(({ slug, name }) => ({ slug, name }));
    return {
      slug: locality.slug, name: locality.name, intro: locality.intro, highlights: locality.highlights, lat: locality.lat, lng: locality.lng,
      city: { slug: locality.city.slug, name: locality.city.name, state: locality.city.state }, stats, bhk, projects, nearby,
    };
  }

  async project(slug: string) {
    const project = await this.db.project.findUnique({ where: { slug }, include: { locality: { include: { city: true } } } });
    if (!project) throw new NotFoundException('Project not found');
    const [properties, stats, bhk] = await Promise.all([
      this.db.property.findMany({ where: { projectId: project.id, state: 'PUBLISHED' }, select: CARD, orderBy: { priceInr: 'asc' } }),
      this.stats({ project: slug }),
      this.bhkBreakdown({ project: slug }),
    ]);
    const { locality, localityId, id, leadEmail, accountId, ...rest } = project; // the builder's sales address and login are for our use only
    return { ...rest, locality: { slug: locality.slug, name: locality.name, lat: locality.lat, lng: locality.lng }, city: { slug: locality.city.slug, name: locality.city.name, state: locality.city.state }, properties, stats, bhk };
  }

  async property(slug: string) {
    const p = await this.db.property.findFirst({
      where: { slug, state: 'PUBLISHED' },
      include: { locality: { include: { city: true } }, project: { select: { slug: true, name: true, builder: true, reraId: true } }, photos: { select: { file: true, width: true, height: true }, orderBy: { position: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Property not found');
    const similar = await this.db.property.findMany({
      where: { state: 'PUBLISHED', localityId: p.localityId, NOT: { id: p.id }, ...(p.bhk ? { bhk: { in: [p.bhk - 1, p.bhk, p.bhk + 1] } } : {}) },
      select: CARD, orderBy: { postedAt: 'desc' }, take: 4,
    });
    const { locality, localityId, projectId, id, ownerId, state, rejectReason, ...rest } = p;
    return {
      ...rest,
      locality: { slug: locality.slug, name: locality.name, lat: locality.lat, lng: locality.lng, highlights: locality.highlights },
      city: { slug: locality.city.slug, name: locality.city.name, state: locality.city.state },
      localityStats: await this.stats({ city: locality.city.slug, locality: locality.slug }),
      similar,
    };
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
  async enquireProject(slug: string, body: Record<string, unknown>) {
    const b = this.buyer(body);
    const project = await this.db.project.findUnique({ where: { slug }, select: { id: true, name: true, leadEmail: true, account: { select: { email: true, active: true } }, locality: { select: { name: true, city: { select: { name: true } } } } } });
    if (!project) throw new NotFoundException('Project not found');
    await this.db.enquiry.create({ data: { projectId: project.id, ...b } });
    const to = this.leadAddress(project);
    if (to) {
      await this.mail.send({
        to, subject: `New lead: ${project.name}, ${project.locality.name}`,
        text: `A buyer asked about ${project.name} in ${project.locality.name}, ${project.locality.city.name}.\n\nName: ${b.name}\nPhone: ${b.phone}${b.email ? `\nEmail: ${b.email}` : ''}${b.interest ? `\nInterested in: ${b.interest}` : ''}${b.message ? `\nMessage: ${b.message}` : ''}\n\nThe buyer agreed to be contacted about this project.`,
      });
    }
    return { ok: true };
  }

  async enquire(slug: string, body: Record<string, unknown>) {
    const { name, phone, email, message } = this.buyer(body);
    const p = await this.db.property.findFirst({ where: { slug, state: 'PUBLISHED' }, select: { id: true, title: true, projectId: true, project: { select: { name: true, leadEmail: true, account: { select: { email: true, active: true } } } }, owner: { select: { name: true, phone: true, email: true, role: true, active: true } } } });
    if (!p) throw new NotFoundException('Property not found');
    await this.db.enquiry.create({ data: { propertyId: p.id, projectId: p.projectId, name, phone, email, message } });
    const seller = p.owner?.active && p.owner.role === 'AGENT' && p.owner.phone ? p.owner : null;
    if (seller) {
      await this.mail.send({
        to: seller.email, subject: `New enquiry: ${p.title}`,
        text: `Hello ${seller.name},\n\n${name} is interested in your listing "${p.title}".\n\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}${message ? `\nMessage: ${message}` : ''}\n\nAll your enquiries: ${SITE_URL}/admin/enquiries`,
      });
    }
    // A listing with no seller account that belongs to a builder project is the builder's own stock: the lead goes to their sales address.
    const builderAddress = p.project ? this.leadAddress(p.project) : null;
    if (!seller && builderAddress) {
      await this.mail.send({
        to: builderAddress, subject: `New lead: ${p.project?.name ?? p.title}`,
        text: `A buyer asked about "${p.title}".\n\nName: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}${message ? `\nMessage: ${message}` : ''}\n\nThe buyer agreed to be contacted about this home.`,
      });
    }
    return { ok: true, seller: seller ? { name: seller.name, phone: seller.phone } : null };
  }

  logQuestion(data: { text: string; live: boolean; total: number; relaxed: string | null; page: string | null }) {
    return this.db.question.create({ data });
  }

  async sitemap() {
    const [cities, properties, projects] = await Promise.all([
      this.db.city.findMany({ select: { slug: true, localities: { select: { slug: true } } } }),
      this.db.property.findMany({ where: { state: 'PUBLISHED' }, select: { slug: true, postedAt: true } }),
      this.db.project.findMany({ select: { slug: true } }),
    ]);
    const configs = await this.db.property.groupBy({ by: ['localityId', 'bhk'], where: { state: 'PUBLISHED', bhk: { gt: 0 } }, _count: true });
    const locs = await this.db.locality.findMany({ select: { id: true, slug: true, city: { select: { slug: true } } } });
    const byId = new Map(locs.map((l) => [l.id, l]));
    return {
      cities: cities.map((c) => ({ slug: c.slug, localities: c.localities.map((l) => l.slug) })),
      configs: configs.map((c) => ({ city: byId.get(c.localityId)!.city.slug, locality: byId.get(c.localityId)!.slug, bhk: c.bhk, count: c._count })),
      properties, projects,
    };
  }
}

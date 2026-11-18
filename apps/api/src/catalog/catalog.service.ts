import { Injectable, NotFoundException } from '@nestjs/common';
import { ConstructionStatus, Prisma, PropertyType } from '@prisma/client';
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
} satisfies Prisma.PropertySelect;

export type PropertyCard = Prisma.PropertyGetPayload<{ select: typeof CARD }>;

export interface Stats { count: number; minPrice: number | null; maxPrice: number | null; avgRate: number | null }

@Injectable()
export class CatalogService {
  constructor(private readonly db: PrismaService) {}

  private where(f: PropertyFilters): Prisma.PropertyWhereInput {
    return {
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
      this.db.property.findMany({ where: { projectId: project.id }, select: CARD, orderBy: { priceInr: 'asc' } }),
      this.stats({ project: slug }),
      this.bhkBreakdown({ project: slug }),
    ]);
    const { locality, localityId, id, ...rest } = project;
    return { ...rest, locality: { slug: locality.slug, name: locality.name, lat: locality.lat, lng: locality.lng }, city: { slug: locality.city.slug, name: locality.city.name, state: locality.city.state }, properties, stats, bhk };
  }

  async property(slug: string) {
    const p = await this.db.property.findUnique({ where: { slug }, include: { locality: { include: { city: true } }, project: { select: { slug: true, name: true, builder: true, reraId: true } } } });
    if (!p) throw new NotFoundException('Property not found');
    const similar = await this.db.property.findMany({
      where: { localityId: p.localityId, NOT: { id: p.id }, ...(p.bhk ? { bhk: { in: [p.bhk - 1, p.bhk, p.bhk + 1] } } : {}) },
      select: CARD, orderBy: { postedAt: 'desc' }, take: 4,
    });
    const { locality, localityId, projectId, id, ...rest } = p;
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

  async sitemap() {
    const [cities, properties, projects] = await Promise.all([
      this.db.city.findMany({ select: { slug: true, localities: { select: { slug: true } } } }),
      this.db.property.findMany({ select: { slug: true, postedAt: true } }),
      this.db.project.findMany({ select: { slug: true } }),
    ]);
    const configs = await this.db.property.groupBy({ by: ['localityId', 'bhk'], where: { bhk: { gt: 0 } }, _count: true });
    const locs = await this.db.locality.findMany({ select: { id: true, slug: true, city: { select: { slug: true } } } });
    const byId = new Map(locs.map((l) => [l.id, l]));
    return {
      cities: cities.map((c) => ({ slug: c.slug, localities: c.localities.map((l) => l.slug) })),
      configs: configs.map((c) => ({ city: byId.get(c.localityId)!.city.slug, locality: byId.get(c.localityId)!.slug, bhk: c.bhk, count: c._count })),
      properties, projects,
    };
  }
}

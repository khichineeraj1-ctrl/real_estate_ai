import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ConstructionStatus, PropertyType } from '@prisma/client';
import { CatalogService, PropertyFilters } from './catalog.service';

const int = (v: string | undefined, name: string) => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new BadRequestException(`${name} must be a whole number`);
  return n;
};
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[], name: string) => {
  if (v == null || v === '') return undefined;
  if (!allowed.includes(v as T)) throw new BadRequestException(`${name} must be one of ${allowed.join(', ')}`);
  return v as T;
};

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('health') health() { return { ok: true }; }
  @Get('cities') cities() { return this.catalog.cities(); }
  @Get('cities/:slug') city(@Param('slug') slug: string) { return this.catalog.city(slug); }
  @Get('localities/:city/:slug') locality(@Param('city') city: string, @Param('slug') slug: string) { return this.catalog.locality(city, slug); }
  @Get('projects/:slug') project(@Param('slug') slug: string) { return this.catalog.project(slug); }
  @Get('properties/:slug') property(@Param('slug') slug: string) { return this.catalog.property(slug); }
  @Get('sitemap') sitemap() { return this.catalog.sitemap(); }

  @Get('properties')
  properties(@Query() q: Record<string, string | undefined>) {
    const f: PropertyFilters = {
      city: q.city || undefined, locality: q.locality || undefined, project: q.project || undefined,
      bhk: int(q.bhk, 'bhk'), minPrice: int(q.minPrice, 'minPrice'), maxPrice: int(q.maxPrice, 'maxPrice'),
      type: oneOf(q.type, Object.values(PropertyType), 'type'), status: oneOf(q.status, Object.values(ConstructionStatus), 'status'),
      sort: oneOf(q.sort, ['newest', 'price_asc', 'price_desc'] as const, 'sort'), page: int(q.page, 'page'), pageSize: int(q.pageSize, 'pageSize'),
    };
    return this.catalog.list(f);
  }
}

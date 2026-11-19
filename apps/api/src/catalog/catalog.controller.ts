import { ArticleService } from '../articles/articles.service';
import { UpcomingService } from './upcoming';
import { STAGES, guideBySlug, guideCards } from '../guides/guides';
import { AlertService } from './alerts';
import { BuyerService } from '../buyer/buyer.service';
import { WatchService } from './watch';
import { BadRequestException, Body, Controller, Get, HttpCode, HttpException, Ip, Param, Post, Query, Headers, NotFoundException } from '@nestjs/common';
import { Limiter } from '../ask/ask.service';
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
  // A few enquiries a minute per visitor is plenty for a person and too slow for a script.
  private enquiries = new Limiter(4, 5_000);
  constructor(private readonly catalog: CatalogService, private readonly watch: WatchService, private readonly buyers: BuyerService, private readonly alerts: AlertService, private readonly upcoming: UpcomingService, private readonly articleList: ArticleService) {}

  @Get('health') health() { return { ok: true }; }
  @Get('upcoming') upcomingList(@Query('city') city?: string) { return this.upcoming.list(city && /^[a-z0-9-]{1,60}$/.test(city) ? city : undefined); }
  @Get('upcoming/:slug') upcomingOne(@Param('slug') slug: string) { return this.upcoming.one(slug); }
  @Post('upcoming/:slug/notify') @HttpCode(200)
  async upcomingNotify(@Param('slug') slug: string, @Body() body: Record<string, unknown> & { visitor?: unknown }, @Ip() ip: string, @Headers('authorization') auth?: string) {
    const who = typeof body?.visitor === 'string' && body.visitor ? body.visitor.slice(0, 64) : ip;
    if (!this.enquiries.allow(who)) throw new HttpException('Too many requests in a short time. Please try again in a minute.', 429);
    return this.upcoming.notify(slug, body ?? {}, await this.buyers.fromToken(auth));
  }
  /** The home page asks for the first few; the New launches page asks for all of them. */
  @Get('launches') launches(@Query('city') city?: string, @Query('all') all?: string) { return this.catalog.launches(city && /^[a-z0-9-]{1,60}$/.test(city) ? city : undefined, all ? 200 : 12); }
  @Get('articles') articles(@Query('kind') kind?: string) { return this.articleList.list(kind ?? 'BLOG'); }
  @Get('articles/:slug') article(@Param('slug') slug: string) { return this.articleList.one(slug); }
  @Get('guides') guides() { return guideCards(); }
  @Get('guide-stages') guideStages() { const cards = guideCards(); return STAGES.map((st) => ({ ...st, guides: cards.filter((g) => g.stage === st.key) })); }
  @Get('guides/:slug') guide(@Param('slug') slug: string) { const g = guideBySlug(slug); if (!g) throw new NotFoundException('Guide not found'); const cards = guideCards(); const order = STAGES.flatMap((st) => cards.filter((c) => c.stage === st.key)); const i = order.findIndex((c) => c.slug === slug); return { ...g, stageInfo: STAGES.find((st) => st.key === g.stage), prev: order[i - 1] ?? null, next: order[i + 1] ?? null, more: cards.filter((x) => x.slug !== slug) }; }
  @Get('cities') cities() { return this.catalog.cities(); }
  @Get('cities/:slug') city(@Param('slug') slug: string) { return this.catalog.city(slug); }
  @Get('localities/:city/:slug') locality(@Param('city') city: string, @Param('slug') slug: string) { return this.catalog.locality(city, slug); }
  @Get('builders') builders() { return this.catalog.builders(); }
  @Get('builders/:slug') builder(@Param('slug') slug: string, @Query('city') city?: string) { return this.catalog.builder(slug, city || undefined); }
  @Get('projects') projects(@Query('text') text?: string, @Query('city') city?: string) { return this.catalog.searchProjects({ text, city: city || undefined }, 8); }
  @Get('projects/:slug') project(@Param('slug') slug: string) { return this.catalog.project(slug); }
  @Get('properties/:slug') property(@Param('slug') slug: string) { return this.catalog.property(slug); }
  @Get('sitemap') sitemap() { return this.catalog.sitemap(); }
  @Get('compare/localities/:city') compareLocalities(@Param('city') city: string, @Query('a') a = '', @Query('b') b = '') { return this.catalog.compareLocalityInsights(city, a, b); }
  @Get('compare/insights') compareHomes(@Query('slugs') slugs?: string) { return this.catalog.compareHomeInsights((slugs ?? '').split(',')); }
  @Get('compare/projects/insights') compareProjectInsights(@Query('slugs') slugs?: string) { return this.catalog.compareProjectInsights((slugs ?? '').split(',')); }
  @Get('compare/projects') compareProjects(@Query('slugs') slugs?: string) { return this.catalog.compareProjects((slugs ?? '').split(',')); }
  @Get('compare') compare(@Query('slugs') slugs?: string) { return this.catalog.compare((slugs ?? '').split(',')); }

  @Post('properties/:slug/enquiries')
  @HttpCode(200)
  async enquire(@Param('slug') slug: string, @Body() body: Record<string, unknown> & { visitor?: unknown }, @Ip() ip: string, @Headers('authorization') auth?: string) {
    // The site sends enquiries on the visitor's behalf and passes their address along for rate limiting.
    const who = typeof body?.visitor === 'string' && body.visitor ? body.visitor.slice(0, 64) : ip;
    if (!this.enquiries.allow(who)) throw new HttpException('Too many enquiries in a short time. Please try again in a minute.', 429);
    // A signed-in buyer's enquiry is kept on their account, so they can see what they sent.
    return this.catalog.enquire(slug, body, (await this.buyers.fromToken(auth))?.id ?? null);
  }

  @Post('projects/:slug/follow')
  @HttpCode(200)
  follow(@Param('slug') slug: string, @Body() body: Record<string, unknown> & { visitor?: unknown }, @Ip() ip: string) {
    const who = typeof body?.visitor === 'string' && body.visitor ? body.visitor.slice(0, 64) : ip;
    if (!this.enquiries.allow(who)) throw new HttpException('Too many requests in a short time. Please try again in a minute.', 429);
    return this.watch.follow(slug, body);
  }
  /** The stop link in any alert email: a followed project, or a search alert. */
  @Post('unfollow') @HttpCode(200) async unfollow(@Body() body: { token?: string }) {
    const r = await this.watch.unfollow(body?.token ?? '');
    return { ok: true, removed: r.removed + await this.alerts.stop(body?.token ?? '') + await this.upcoming.stop(body?.token ?? '') };
  }

  @Post('alerts') @HttpCode(200)
  async alert(@Body() body: Record<string, unknown> & { visitor?: unknown }, @Ip() ip: string, @Headers('authorization') auth?: string) {
    const who = typeof body?.visitor === 'string' && body.visitor ? body.visitor.slice(0, 64) : ip;
    if (!this.enquiries.allow(who)) throw new HttpException('Too many requests in a short time. Please try again in a minute.', 429);
    return this.alerts.create(body ?? {}, await this.buyers.fromToken(auth));
  }

  @Post('projects/:slug/enquiries')
  @HttpCode(200)
  async enquireProject(@Param('slug') slug: string, @Body() body: Record<string, unknown> & { visitor?: unknown }, @Ip() ip: string, @Headers('authorization') auth?: string) {
    const who = typeof body?.visitor === 'string' && body.visitor ? body.visitor.slice(0, 64) : ip;
    if (!this.enquiries.allow(who)) throw new HttpException('Too many enquiries in a short time. Please try again in a minute.', 429);
    return this.catalog.enquireProject(slug, body, (await this.buyers.fromToken(auth))?.id ?? null);
  }

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

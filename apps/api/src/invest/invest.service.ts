import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Input, slugify } from '../admin/input';
import { cleanEmail } from '../buyer/buyer.service';
import { LandService } from '../land/land.service';
import { cleanDistrict, stateBySlug } from '../land/rules';
import { PrismaService } from '../prisma/prisma.service';
import { BUDGETS, DRIVERS, DRIVER_LABEL, HORIZONS, INVEST_NOTICE, STAGES, STAGE_LABEL, STAGE_MEANS, WANTS, promiseWords, readMilestones, readSources, type Milestone, type Source } from './rules';

type Body = Record<string, unknown>;
const key = <T extends object>(v: unknown, of: T): keyof T | null => (typeof v === 'string' && v in of ? (v as keyof T) : null);

/**
 * The investor corner. Our team writes each area from the official documents and links them; readers say they are
 * interested, and that comes to our team to follow up. Nothing here predicts a price or a return.
 */
@Injectable()
export class InvestService {
  constructor(private readonly db: PrismaService, private readonly land: LandService) {}

  private card = { slug: true, title: true, driver: true, state: true, stateSlug: true, districts: true, summary: true, stage: true, authority: true, reviewedAt: true, _count: { select: { interests: true } } } as const;
  private shape<T extends { driver: string; stage: string; _count: { interests: number } }>(a: T) {
    const { _count, ...rest } = a;
    return { ...rest, driverLabel: DRIVER_LABEL[a.driver as keyof typeof DRIVER_LABEL] ?? 'Plan', stageLabel: STAGE_LABEL[a.stage as keyof typeof STAGE_LABEL] ?? a.stage, stageIndex: Math.max(0, STAGES.indexOf(a.stage as (typeof STAGES)[number])), interested: _count.interests };
  }

  options() {
    return { notice: INVEST_NOTICE, stages: STAGES.map((s) => ({ code: s, label: STAGE_LABEL[s], means: STAGE_MEANS[s] })), drivers: DRIVERS.map((d) => ({ code: d, label: DRIVER_LABEL[d] })),
      budgets: Object.entries(BUDGETS).map(([code, label]) => ({ code, label })), wants: Object.entries(WANTS).map(([code, label]) => ({ code, label })), horizons: Object.entries(HORIZONS).map(([code, label]) => ({ code, label })) };
  }
  async list(q: { state?: string; driver?: string } = {}) {
    const rows = await this.db.investArea.findMany({ where: { status: 'LIVE', stateSlug: q.state || undefined, driver: key(q.driver, DRIVER_LABEL) ?? undefined }, orderBy: { updatedAt: 'desc' }, take: 60, select: this.card });
    return { notice: INVEST_NOTICE, items: rows.map((r) => this.shape(r)) };
  }
  async one(slug: string) {
    const a = await this.db.investArea.findFirst({ where: { slug, status: 'LIVE' }, select: { ...this.card, plan: true, stageNote: true, sources: true, milestones: true, watch: true, districtSlugs: true } });
    if (!a) throw new NotFoundException('Not found');
    // Land listed in the districts it touches, so the reader can see what is actually on offer there.
    const listed = (await Promise.all(a.districtSlugs.slice(0, 4).map((d) => this.land.list({ state: a.stateSlug, district: d, take: 6 })))).flatMap((r) => r.items).slice(0, 6);
    const { districtSlugs, ...rest } = a;
    return { ...this.shape(rest), plan: a.plan, stageMeans: STAGE_MEANS[a.stage as keyof typeof STAGE_MEANS] ?? null, stages: STAGES.map((s) => STAGE_LABEL[s]), sources: a.sources as unknown as Source[], milestones: a.milestones as unknown as Milestone[], notice: INVEST_NOTICE, land: listed, firstDistrict: districtSlugs[0] ?? null };
  }

  /** "I am interested": in one area, or in general when no area is given. */
  async interest(slug: string | null, body: Body) {
    if (typeof body.website === 'string' && body.website) return { ok: true as const };
    const i = new Input(body);
    const name = i.text('name', 'Your name', 80);
    const phone = i.text('phone', 'Phone', 20).replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,13}$/.test(phone)) throw new BadRequestException('Enter a phone number with 10 to 13 digits');
    const raw = typeof body.email === 'string' ? body.email.trim() : '';
    const email = raw ? cleanEmail(raw) : null;
    if (raw && !email) throw new BadRequestException('Enter a valid email address, or leave it empty');
    if (body.consent !== true && body.consent !== 'on') throw new BadRequestException('Please agree to be called about this');
    const area = slug ? await this.db.investArea.findFirst({ where: { slug, status: 'LIVE' }, select: { id: true } }) : null;
    if (slug && !area) throw new NotFoundException('Not found');
    // One note per person per area a day is plenty; a repeat just refreshes what they told us.
    const since = new Date(Date.now() - 86_400_000);
    const data = { name, phone, email, budget: key(body.budget, BUDGETS), wants: key(body.wants, WANTS), horizon: key(body.horizon, HORIZONS), note: i.optionalText('note', 'Message', 600) };
    const again = await this.db.investInterest.findFirst({ where: { phone, areaId: area?.id ?? null, createdAt: { gt: since } }, select: { id: true } });
    if (again) await this.db.investInterest.update({ where: { id: again.id }, data }); else await this.db.investInterest.create({ data: { ...data, areaId: area?.id ?? null } });
    return { ok: true as const };
  }

  // ---- Our team

  all() {
    return this.db.investArea.findMany({ orderBy: { updatedAt: 'desc' }, take: 200, select: { id: true, slug: true, title: true, state: true, stage: true, status: true, reviewedAt: true, updatedAt: true, _count: { select: { interests: true } } } });
  }
  async forEdit(id: string) {
    const a = await this.db.investArea.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Not found');
    return { ...a, sourcesText: (a.sources as unknown as Source[]).map((s) => `${s.label} | ${s.url}`).join('\n'), milestonesText: (a.milestones as unknown as Milestone[]).map((m) => `${m.when} | ${m.what}`).join('\n') };
  }
  private read(body: Body) {
    const i = new Input(body);
    const title = i.text('title', 'Title', 120);
    const state = stateBySlug(String(body.state ?? ''));
    if (!state) throw new BadRequestException('Choose a state');
    const districts = i.list('districts', 'Districts', 12).map((d) => cleanDistrict(d)).filter((d): d is NonNullable<typeof d> => !!d);
    const summary = i.text('summary', 'Summary', 320);
    const plan = i.text('plan', 'What the plan says', 4_000);
    const stageNote = i.optionalText('stageNote', 'Stage note', 240);
    const watch = String(body.watch ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10).map((x) => x.slice(0, 240));
    const { sources, error: sourceError } = readSources(String(body.sources ?? ''));
    if (sourceError) throw new BadRequestException(`Sources: ${sourceError}`);
    const { milestones, error: dateError } = readMilestones(String(body.milestones ?? ''));
    if (dateError) throw new BadRequestException(`Milestones: ${dateError}`);
    for (const [label, text] of [['The title', title], ['The summary', summary], ['“What the plan says”', plan], ['The stage note', stageNote], ['“What to watch”', watch.join(' ')], ['The milestones', milestones.map((m) => m.what).join(' ')]] as const) {
      const word = promiseWords(text);
      if (word) throw new BadRequestException(`${label} says “${word}”. This corner reports what is planned and how far along it is; it must not promise or predict prices or returns. Reword it as a fact from the source.`);
    }
    return { title, driver: i.oneOf('driver', 'What is driving it', DRIVERS), stateSlug: state.slug, state: state.name, districts: districts.map((d) => d.name), districtSlugs: districts.map((d) => d.slug), summary, plan,
      stage: i.oneOf('stage', 'Stage', STAGES), stageNote, authority: i.optionalText('authority', 'Authority', 120), sources, milestones, watch, staffNote: i.optionalText('staffNote', 'Notes for staff', 3_000) };
  }
  async save(id: string | null, body: Body) {
    const data = this.read(body);
    const store = { ...data, sources: data.sources as unknown as object[], milestones: data.milestones as unknown as object[] };
    if (id) {
      const a = await this.db.investArea.findUnique({ where: { id }, select: { status: true } });
      if (!a) throw new NotFoundException('Not found');
      if (a.status === 'LIVE' && data.sources.length === 0) throw new BadRequestException('A live area needs at least one source. Add one, or take it down first.');
      await this.db.investArea.update({ where: { id }, data: store });
      return { ok: true as const, id };
    }
    const base = slugify(`${data.title} ${data.state}`) || 'area';
    const slug = (await this.db.investArea.findUnique({ where: { slug: base }, select: { id: true } })) ? `${base.slice(0, 80)}-${randomBytes(3).toString('hex')}` : base;
    const made = await this.db.investArea.create({ data: { ...store, slug }, select: { id: true } });
    return { ok: true as const, id: made.id };
  }
  /** Going live needs a source, and records that the facts were checked today. "Checked again" renews that date. */
  async publish(id: string, body: Body) {
    const to = new Input(body).oneOf('to', 'Action', ['LIVE', 'DRAFT', 'REVIEWED'] as const);
    const a = await this.db.investArea.findUnique({ where: { id }, select: { sources: true } });
    if (!a) throw new NotFoundException('Not found');
    if (to !== 'DRAFT' && (a.sources as unknown[]).length === 0) throw new BadRequestException('Add at least one official source before this goes live: every statement here must be traceable.');
    await this.db.investArea.update({ where: { id }, data: to === 'DRAFT' ? { status: 'DRAFT' } : { status: 'LIVE', reviewedAt: new Date() } });
    return { ok: true as const };
  }
  async remove(id: string) { await this.db.investArea.deleteMany({ where: { id, status: 'DRAFT' } }); return { ok: true as const }; }
  interests(status?: string) {
    return this.db.investInterest.findMany({ where: { status: status === 'DONE' ? 'DONE' : 'NEW' }, orderBy: { createdAt: 'desc' }, take: 300, include: { area: { select: { slug: true, title: true } } } })
      .then((rows) => rows.map((r) => ({ ...r, budgetLabel: r.budget ? BUDGETS[r.budget as keyof typeof BUDGETS] : null, wantsLabel: r.wants ? WANTS[r.wants as keyof typeof WANTS] : null, horizonLabel: r.horizon ? HORIZONS[r.horizon as keyof typeof HORIZONS] : null })));
  }
  async interestDone(id: string) { await this.db.investInterest.updateMany({ where: { id }, data: { status: 'DONE' } }); return { ok: true as const }; }
  async waiting() { return { interests: await this.db.investInterest.count({ where: { status: 'NEW' } }) }; }
}

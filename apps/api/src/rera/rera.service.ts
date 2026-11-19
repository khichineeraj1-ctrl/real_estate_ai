import { WatchService } from '../catalog/watch';
import { builderFor, ensureBuilder } from '../catalog/builders';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, RegisterProject, RegisterSource } from '@prisma/client';
import { slugify } from '../admin/input';
import { PrismaService } from '../prisma/prisma.service';
import { LIST_URL, RegisterEntry, SOURCE_NAME, displayName, parseHaryana, parseKarnataka, parseMaharashtra, projectName } from './parse';
import { CITY_OF, PINCODES, Spot, place } from './place';

/**
 * Reads the public RERA registers and turns the entries we can place into project pages.
 *
 * It behaves like a careful visitor: it identifies itself, asks for a page at a time with a pause in between, reads
 * only the public project lists, and stops at the first refusal. It does not log in, solve challenges or work around
 * blocks. What it stores is facts the registers publish (name, promoter, registration number, location, dates), and
 * every page made from them says where the facts came from and that the builder has not confirmed them.
 */
const USER_AGENT = process.env.RERA_USER_AGENT || 'Mozilla/5.0 (compatible; rera-register-reader)';
const PAUSE_MS = 2500;
const PAGE = 50;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class RegisterService {
  private log = new Logger('Register');
  private running = new Set<RegisterSource>();
  constructor(private readonly db: PrismaService, private readonly watch: WatchService) {}

  // ---- Fetching

  private async get(url: string, init?: RequestInit): Promise<string> {
    const res = await fetch(url, { ...init, headers: { 'user-agent': USER_AGENT, accept: 'text/html', ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(180_000) });
    if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
    const body = await res.text();
    // A challenge page instead of the list means the site does not want automated readers right now: stop, do not work around it.
    if (/captcha|are you a robot|access denied/i.test(body.slice(0, 20_000)) && body.length < 60_000) throw new Error(`${new URL(url).host} asked for a human check; the import stopped there`);
    return body;
  }

  /** A dropped connection is tried once more after a pause. A refusal from the site (any HTTP error) is never retried. */
  private async getPatiently(url: string): Promise<string> {
    try {
      return await this.get(url);
    } catch (e) {
      if (e instanceof Error && / answered \d{3}| human check/.test(e.message)) throw e;
      await sleep(10_000);
      return this.get(url);
    }
  }

  private async fetchEntries(source: RegisterSource, maxPages: number, count: (n: number) => void): Promise<{ entries: RegisterEntry[]; stopped?: string }> {
    if (source === 'HARYANA') { count(1); return { entries: parseHaryana(await this.get(LIST_URL.HARYANA)) }; }
    if (source === 'KARNATAKA') {
      count(1);
      const form = new URLSearchParams({ project: '', firm: '', appNo: '', regNo: '', district: 'Bengaluru Urban', subdistrict: '0' });
      return { entries: parseKarnataka(await this.get(LIST_URL.KARNATAKA, { method: 'POST', body: form, headers: { 'content-type': 'application/x-www-form-urlencoded' } })) };
    }
    // Maharashtra is searched a pincode at a time, for the pincodes of our own localities only.
    const out = new Map<string, RegisterEntry>();
    const pincodes = [...new Set(Object.values(PINCODES).flat())];
    let requests = 0;
    for (const pin of pincodes) {
      for (let page = 1; page <= maxPages; page++) {
        const q = new URLSearchParams({ project_name: '', project_location: pin, project_completion_date: '', project_state: '27', project_district: '0', carpetAreas: '', completionPercentages: '', project_division: '', page: String(page), op: '' });
        if (requests++) await sleep(PAUSE_MS);
        count(1);
        let body: string;
        try {
          body = await this.getPatiently(`${LIST_URL.MAHARASHTRA}?${q}`);
        } catch (e) {
          // Stop here and keep what has been read so far, instead of pressing on against a site that is struggling or refusing.
          return { entries: [...out.values()], stopped: `stopped at pincode ${pin}, page ${page}: ${e instanceof Error ? e.message : 'request failed'}` };
        }
        const { total, entries } = parseMaharashtra(body);
        for (const e of entries) out.set(e.regNo, e);
        if (!entries.length || !total || page * 10 >= total) break;
      }
    }
    return { entries: [...out.values()] };
  }

  // ---- Running an import

  /** Starts reading one register in the background and returns at once; progress is in the run record. */
  async start(source: RegisterSource, opts: { maxPages?: number } = {}) {
    if (this.running.has(source)) throw new ConflictException(`${SOURCE_NAME[source]} is already being read`);
    const recent = await this.db.importRun.findFirst({ where: { source, startedAt: { gt: new Date(Date.now() - 10 * 60_000) }, error: null } });
    if (recent) throw new ConflictException(`${SOURCE_NAME[source]} was read less than ten minutes ago. Registers change slowly; once a day is plenty.`);
    const run = await this.db.importRun.create({ data: { source } });
    this.running.add(source);
    void this.run(run.id, source, Math.min(Math.max(opts.maxPages ?? 5, 1), 40)).finally(() => this.running.delete(source));
    return run;
  }

  private async run(runId: string, source: RegisterSource, maxPages: number) {
    let requests = 0;
    try {
      const { entries, stopped } = await this.fetchEntries(source, maxPages, (n) => { requests += n; });
      if (!entries.length) throw new Error(stopped ?? 'The register page had no projects on it. Its layout may have changed; nothing was altered.');
      const now = new Date();
      const existing = new Map((await this.db.registerProject.findMany({ where: { source }, select: { id: true, regNo: true } })).map((r) => [r.regNo, r.id]));
      const fresh = entries.filter((e) => !existing.has(e.regNo));
      await this.db.registerProject.createMany({ data: fresh.map((e) => ({ ...e, fetchedAt: now })), skipDuplicates: true });
      // Entries seen before are brought up to date, so a lapsed registration or an extended date shows through.
      for (const e of entries) {
        const id = existing.get(e.regNo);
        if (id) await this.db.registerProject.update({ where: { id }, data: { name: e.name, promoter: e.promoter, locationText: e.locationText, registerStatus: e.registerStatus, validUntil: e.validUntil, sourceUrl: e.sourceUrl, lat: e.lat, lng: e.lng, pincode: e.pincode, fetchedAt: now } });
      }
      const published = await this.publishPlaced(source);
      const note = stopped ? `Incomplete: ${stopped}. What was read before that has been kept.` : source === 'MAHARASHTRA' ? `Read up to ${maxPages} pages for each of our localities’ pincodes.` : source === 'KARNATAKA' ? 'Karnataka gives only the taluk, so most entries need placing by hand.' : null;
      await this.db.importRun.update({ where: { id: runId }, data: { finishedAt: new Date(), fetched: entries.length, added: fresh.length, published, requests, note } });
      this.log.log(`${SOURCE_NAME[source]}: ${entries.length} entries read in ${requests} request(s), ${fresh.length} new, ${published} project pages created.`);
      await this.watch.notifyChanges().catch((e: Error) => this.log.error(`Followers were not told of changes: ${e.message}`));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'The import failed';
      this.log.error(`${SOURCE_NAME[source]}: ${message}`);
      await this.db.importRun.update({ where: { id: runId }, data: { finishedAt: new Date(), requests, error: message.slice(0, 300) } });
    }
  }

  // ---- Turning register entries into project pages

  private async spots(): Promise<Spot[]> {
    const rows = await this.db.locality.findMany({ select: { id: true, slug: true, name: true, lat: true, lng: true, city: { select: { slug: true } } } });
    return rows.map((l) => ({ id: l.id, slug: l.slug, name: l.name, lat: l.lat, lng: l.lng, citySlug: l.city.slug }));
  }

  /** Publishes every unpublished entry of a register that can be placed, and refreshes the ones already published. */
  private async publishPlaced(source: RegisterSource): Promise<number> {
    const spots = await this.spots();
    const waiting = await this.db.registerProject.findMany({ where: { source, projectId: null } });
    let made = 0;
    for (const r of waiting) {
      if (/commercial|industrial/i.test(r.projectType ?? '') && !/residential/i.test(r.projectType ?? '')) continue; // we list homes
      const where = place(r, spots);
      if (where) { await this.publish(r, where.spot.id, where.how); made++; }
    }
    const live = await this.db.registerProject.findMany({ where: { source, projectId: { not: null } } });
    for (const r of live) await this.db.project.update({ where: { id: r.projectId! }, data: this.registerFacts(r) }).catch(() => undefined);
    return made;
  }

  /**
   * Re-judges every page that was placed automatically, and takes down any the current rules would no longer place
   * where it is. Run after the placement rules change. Pages placed by a person, or with listings, are left alone.
   */
  async recheck(source: RegisterSource): Promise<{ checked: number; takenDown: number; kept: number }> {
    const spots = await this.spots();
    const live = await this.db.registerProject.findMany({ where: { source, projectId: { not: null }, NOT: { placedHow: 'placed by our team' } }, include: { project: { select: { id: true, localityId: true, _count: { select: { properties: true } } } } } });
    let takenDown = 0;
    for (const r of live) {
      const where = place(r, spots);
      if (r.project && (!where || where.spot.id !== r.project.localityId) && r.project._count.properties === 0) {
        await this.db.project.delete({ where: { id: r.project.id } });
        await this.db.registerProject.update({ where: { id: r.id }, data: { placedHow: null } });
        takenDown++;
      }
    }
    const published = await this.publishPlaced(source); // anything the new rules can now place, or place elsewhere
    return { checked: live.length, takenDown, kept: live.length - takenDown + published };
  }

  /** The facts a project page shows from the register, kept in step with the register on every read. */
  private registerFacts(r: RegisterProject) {
    const future = r.validUntil && r.validUntil > new Date();
    return {
      registerSource: r.source, registerStatus: r.registerStatus, registerValidUntil: r.validUntil, sourceUrl: r.sourceUrl, sourceFetchedAt: r.fetchedAt, reraId: r.regNo,
      // The register does not say whether a project is finished. A registration still running means building is
      // expected to be going on; for the rest the page says "registration ran to …" and makes no claim either way.
      status: future ? 'UNDER_CONSTRUCTION' as const : 'READY_TO_MOVE' as const, possession: future ? r.validUntil : null,
    };
  }

  private async publish(r: RegisterProject, localityId: string, how: string) {
    const locality = await this.db.locality.findUnique({ where: { id: localityId }, select: { name: true, city: { select: { name: true, slug: true } } } });
    if (!locality) throw new BadRequestException('Choose a locality from the list');
    if (!(CITY_OF[r.source] as readonly string[]).includes(locality.city.slug)) throw new BadRequestException(`${SOURCE_NAME[r.source]} covers ${CITY_OF[r.source].join(' and ')}, not ${locality.city.name}`);
    const builder = displayName(r.promoter) || 'Not stated in the register';
    // The name made fit to read; one that only says the kind of project ("Group Housing Colony") is given its builder.
    const name = projectName(r.name, builderFor(builder).name);
    const base = slugify(`${name} ${locality.name} ${locality.city.name}`);
    const taken = await this.db.project.findUnique({ where: { slug: base }, select: { id: true } });
    const slug = taken ? `${base.slice(0, 80)}-${slugify(r.regNo).slice(-8)}` : base;
    const validTo = r.validUntil ? r.validUntil.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
    const description = `${name} is a project by ${builder} in ${locality.name}, ${locality.city.name}, registered with ${SOURCE_NAME[r.source]} under number ${r.regNo}.${validTo ? ` Its registration ${r.validUntil! > new Date() ? 'runs' : 'ran'} to ${validTo}.` : ''}`;
    try {
      const project = await this.db.project.create({ data: { slug, name, builder, brandId: await ensureBuilder(this.db, builder), description, amenities: [], totalUnits: null, localityId, ...this.registerFacts(r) } });
      await this.db.registerProject.update({ where: { id: r.id }, data: { projectId: project.id, placedHow: how } });
      return project;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null; // the same project under two certificates: keep the first page
      throw e;
    }
  }

  // ---- For the admin panel

  async overview() {
    const runs = await this.db.importRun.findMany({ orderBy: { startedAt: 'desc' }, take: 12 });
    const counts = await this.db.registerProject.groupBy({ by: ['source'], _count: true });
    const publishedCounts = await this.db.registerProject.groupBy({ by: ['source'], where: { projectId: { not: null } }, _count: true });
    const sources = (Object.keys(SOURCE_NAME) as RegisterSource[]).map((s) => ({
      source: s, name: SOURCE_NAME[s], url: LIST_URL[s], covers: CITY_OF[s], entries: counts.find((c) => c.source === s)?._count ?? 0,
      published: publishedCounts.find((c) => c.source === s)?._count ?? 0, running: this.running.has(s), lastRun: runs.find((r) => r.source === s) ?? null,
    }));
    return { sources, runs };
  }

  async list(q: { source?: string; q?: string; placed?: string; page?: string }) {
    const source = (Object.keys(SOURCE_NAME) as RegisterSource[]).find((s) => s === q.source);
    const where: Prisma.RegisterProjectWhereInput = {
      ...(source ? { source } : {}), ...(q.placed === 'yes' ? { projectId: { not: null } } : q.placed === 'no' ? { projectId: null } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { promoter: { contains: q.q, mode: 'insensitive' } }, { regNo: { contains: q.q, mode: 'insensitive' } }, { locationText: { contains: q.q, mode: 'insensitive' } }] } : {}),
    };
    const page = Math.max(1, Number.parseInt(q.page ?? '1', 10) || 1);
    const [items, total] = await Promise.all([
      this.db.registerProject.findMany({ where, orderBy: [{ name: 'asc' }], skip: (page - 1) * PAGE, take: PAGE, include: { project: { select: { id: true, slug: true, brand: { select: { slug: true } }, locality: { select: { name: true } } } } } }),
      this.db.registerProject.count({ where }),
    ]);
    return { items, total, page, pageSize: PAGE };
  }

  /** A person places an entry the importer could not, and it becomes a project page there. */
  async publishTo(id: string, localityId: unknown) {
    const r = await this.db.registerProject.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Register entry not found');
    if (r.projectId) throw new ConflictException('This entry already has a project page');
    if (typeof localityId !== 'string' || !localityId) throw new BadRequestException('Choose a locality');
    const project = await this.publish(r, localityId, 'placed by our team');
    if (!project) throw new ConflictException('A project page with this name already exists in that locality');
    return { ok: true, slug: project.slug };
  }

  /** Takes a register-made project page down again. Refused once the page has listings of its own. */
  async unpublish(id: string) {
    const r = await this.db.registerProject.findUnique({ where: { id }, include: { project: { select: { id: true, _count: { select: { properties: true } } } } } });
    if (!r?.project) throw new NotFoundException('This entry has no project page');
    if (r.project._count.properties) throw new ConflictException('This project page has listings. Move or remove them first.');
    await this.db.project.delete({ where: { id: r.project.id } });
    await this.db.registerProject.update({ where: { id }, data: { placedHow: null } });
    return { ok: true };
  }
}

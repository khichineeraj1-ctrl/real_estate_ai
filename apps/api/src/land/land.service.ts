import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Input, slugify } from '../admin/input';
import { MAX_PHOTO_BYTES, processPhoto, removePhoto, savePhoto, sniffImage, type ProcessedPhoto } from '../admin/photos';
import { cleanEmail } from '../buyer/buyer.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEALS, FEATURES, KINDS, KIND_LABEL, LAND_USES, POSTERS, PURPOSES, PURPOSE_LABEL, STATES, UNITS, areaAlso, areaText, cleanDistrict, landChecks, landIntent, listingTitle, rate, stateBySlug, toSqft, type Kind } from './rules';

type Body = Record<string, unknown>;
export const MAX_LAND_PHOTOS = 8;
const PHOTOS = { orderBy: { position: 'asc' }, select: { file: true, width: true, height: true } } as const;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const num = (v: bigint | null) => (v == null ? null : Number(v));
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => (allowed.includes(v as T) ? (v as T) : undefined);

/**
 * Land and commercial space. Anyone can post without an account; nothing shows until our team has looked at it, and
 * the poster's phone number is never shown: enquiries and answers come to our team, who make the introduction.
 */
@Injectable()
export class LandService {
  constructor(private readonly db: PrismaService) {}

  private contact(i: Input, body: Body) {
    const posterName = i.text('name', 'Your name', 80);
    const posterPhone = i.text('phone', 'Phone', 20).replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,13}$/.test(posterPhone)) throw new BadRequestException('Enter a phone number with 10 to 13 digits');
    const raw = typeof body.email === 'string' ? body.email.trim() : '';
    const posterEmail = raw ? cleanEmail(raw) : null;
    if (raw && !posterEmail) throw new BadRequestException('Enter a valid email address, or leave it empty');
    return { posterName, posterPhone, posterEmail };
  }
  private price(i: Input, key: string, label: string) {
    const n = i.optionalNumber(key, label, 1_000, 50_000_000_000);
    return n == null ? null : BigInt(n);
  }
  private async slug(base: string, taken: (slug: string) => Promise<unknown>) {
    const s = slugify(base) || 'land';
    return (await taken(s)) ? `${s.slice(0, 80)}-${randomBytes(3).toString('hex')}` : s;
  }

  // ---- Listings, for everyone

  private shape(l: { slug: string; kind: string; deal: string; title: string; state: string; stateSlug: string; district: string; districtSlug: string; place: string; areaValue: number; areaUnit: string; priceInr: bigint | null; roadFt: number | null; highway: string | null; highwayKm: number | null; landUse: string | null; posterIs: string; createdAt: Date; photos: { file: string; width: number; height: number }[] }) {
    const priceInr = num(l.priceInr);
    return { ...l, priceInr, kindLabel: KIND_LABEL[l.kind as Kind], area: areaText(l.areaValue, l.areaUnit), areaAlso: areaAlso(l.areaValue, l.areaUnit), rate: rate({ ...l, priceInr }) };
  }
  private card = { slug: true, kind: true, deal: true, title: true, state: true, stateSlug: true, district: true, districtSlug: true, place: true, areaValue: true, areaUnit: true, priceInr: true, roadFt: true, highway: true, highwayKm: true, landUse: true, posterIs: true, createdAt: true, photos: PHOTOS } as const;

  async list(q: { kind?: string; deal?: string; state?: string; district?: string; take?: number }) {
    const where = { status: 'LIVE', kind: pick(q.kind, KINDS), deal: pick(q.deal, DEALS), stateSlug: q.state || undefined, districtSlug: q.district || undefined };
    const [rows, total] = await Promise.all([
      this.db.landListing.findMany({ where, orderBy: { decidedAt: 'desc' }, take: Math.min(q.take ?? 24, 60), select: this.card }),
      this.db.landListing.count({ where }),
    ]);
    return { total, items: rows.map((r) => this.shape(r)) };
  }
  async one(slug: string) {
    const l = await this.db.landListing.findFirst({ where: { slug, status: { in: ['LIVE', 'CLOSED'] } }, select: { ...this.card, description: true, features: true, clearHeightFt: true, powerKva: true, docks: true, status: true } });
    if (!l) throw new NotFoundException('Not found');
    const nearby = await this.db.landListing.findMany({ where: { status: 'LIVE', stateSlug: l.stateSlug, districtSlug: l.districtSlug, slug: { not: slug } }, orderBy: { decidedAt: 'desc' }, take: 4, select: this.card });
    return { ...this.shape(l), description: l.description, closed: l.status === 'CLOSED', features: l.features.map((f) => FEATURES[f]).filter(Boolean), clearHeightFt: l.clearHeightFt, powerKva: l.powerKva, docks: l.docks, checks: landChecks(l), nearby: nearby.map((r) => this.shape(r)) };
  }
  /**
   * The assistant's answer to a question about land, or null when the question is about a home. A district counts
   * when something is listed in it; nothing found is answered with where to post, never with invented listings.
   */
  async askAbout(question: string) {
    const intent = landIntent(question);
    if (!intent) return null;
    const text = ` ${question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
    const districts = await this.db.landListing.groupBy({ by: ['stateSlug', 'state', 'districtSlug', 'district'], where: { status: 'LIVE', ...(intent.state ? { stateSlug: intent.state.slug } : {}) } });
    const district = districts.find((d) => text.includes(` ${d.district.toLowerCase()} `));
    const state = intent.state ?? (district ? { slug: district.stateSlug, name: district.state } : undefined);
    const { total, items } = await this.list({ kind: intent.kind, deal: intent.deal, state: state?.slug, district: district?.districtSlug, take: 6 });
    const what = intent.kind ? ({ FARM: 'farm land', PLOT: 'plots', INDUSTRIAL: 'industrial land', BUILT: 'warehouses and shops' } as const)[intent.kind] : 'land and commercial space';
    const where = district ? ` in ${district.district}, ${district.state}` : state ? ` in ${state.name}` : '';
    const deal = intent.deal === 'LEASE' ? ' for rent' : intent.deal === 'SALE' ? ' for sale' : '';
    const qs = new URLSearchParams({ ...(intent.kind ? { kind: intent.kind } : {}), ...(intent.deal ? { deal: intent.deal } : {}) }).toString();
    if (total === 0) return {
      reply: `Nothing matching ${what}${deal}${where} is listed yet. Land here comes from owners across India and is new, so the quickest way is to post what you need: say the size, the area and what it is for, and owners with something that fits answer you. It is free.`,
      items, total, page: { path: '/land/wanted/post', label: 'Post what you are looking for' },
    };
    const priced = items.filter((i) => i.rate).slice(0, 2).map((i) => `${i.area} in ${i.place} at ${i.rate}`);
    return {
      reply: `I found ${total} listing${total === 1 ? '' : 's'} of ${what}${deal}${where}.${priced.length ? ` For example, ${priced.join(', and ')}.` : ''} These are listed by owners and dealers and checked by our team, but ownership papers are not verified: each listing shows what to check before paying.`,
      items, total, page: { path: district ? `/land/${district.stateSlug}/${district.districtSlug}` : state && !qs ? `/land/${state.slug}` : `/land${qs ? `?${qs}` : ''}`, label: district ? `Land in ${district.district}` : state && !qs ? `Land in ${state.name}` : `All ${what}${deal}` },
    };
  }

  /** Where there is something to see: states and their districts with live listings, and how many of each kind. */
  async places() {
    const [byDistrict, byKind, wanted] = await Promise.all([
      this.db.landListing.groupBy({ by: ['stateSlug', 'state', 'districtSlug', 'district'], where: { status: 'LIVE' }, _count: true }),
      this.db.landListing.groupBy({ by: ['kind'], where: { status: 'LIVE' }, _count: true }),
      this.db.landWanted.count({ where: { status: 'LIVE' } }),
    ]);
    const states = new Map<string, { slug: string; name: string; count: number; districts: { slug: string; name: string; count: number }[] }>();
    for (const d of byDistrict) {
      const s = states.get(d.stateSlug) ?? { slug: d.stateSlug, name: d.state, count: 0, districts: [] };
      s.count += d._count; s.districts.push({ slug: d.districtSlug, name: d.district, count: d._count }); states.set(d.stateSlug, s);
    }
    const list = [...states.values()].sort((a, b) => b.count - a.count);
    for (const s of list) s.districts.sort((a, b) => b.count - a.count);
    return { states: list, kinds: KINDS.map((k) => ({ kind: k, label: KIND_LABEL[k], count: byKind.find((x) => x.kind === k)?._count ?? 0 })), wanted, allStates: STATES };
  }

  async post(body: Body) {
    if (typeof body.website === 'string' && body.website) return { ok: true as const, slug: '', token: '' };
    const i = new Input(body);
    const kind = i.oneOf('kind', 'What you are listing', KINDS);
    const deal = i.oneOf('deal', 'Sale or rent', DEALS);
    const state = stateBySlug(String(body.state ?? ''));
    if (!state) throw new BadRequestException('Choose a state');
    const district = cleanDistrict(i.text('district', 'District', 60));
    if (!district) throw new BadRequestException('Enter the district name');
    const place = i.text('place', 'Town or village', 80);
    const areaUnit = i.oneOf('areaUnit', 'Unit', UNITS);
    const areaValue = i.number('areaValue', 'Size', 0.01, 100_000, false);
    const features = (Array.isArray(body.features) ? body.features : String(body.features ?? '').split(',')).map(String).filter((f) => f in FEATURES).slice(0, 12);
    if (body.consent !== true && body.consent !== 'on') throw new BadRequestException('Please confirm you have the right to offer this land');
    const token = randomBytes(24).toString('base64url');
    const title = listingTitle({ kind, deal, areaValue, areaUnit, place, district: district.name });
    const slug = await this.slug(`${title} ${state.name}`, (s) => this.db.landListing.findUnique({ where: { slug: s }, select: { id: true } }));
    const contact = this.contact(i, body);
    if ((await this.db.landListing.count({ where: { posterPhone: contact.posterPhone, status: 'PENDING' } })) >= 5) throw new BadRequestException('You have five listings waiting for our team. Please wait for those to be looked at.');
    await this.db.landListing.create({ data: {
      slug, kind, deal, title, description: i.optionalText('description', 'Description', 1_000),
      stateSlug: state.slug, state: state.name, districtSlug: district.slug, district: district.name, place,
      areaValue, areaUnit, areaSqft: toSqft(areaValue, areaUnit), priceInr: this.price(i, 'priceInr', deal === 'LEASE' ? 'Monthly rent' : 'Asking price'),
      roadFt: i.optionalNumber('roadFt', 'Road width', 1, 500), highway: i.optionalText('highway', 'Nearest highway or main road', 60),
      highwayKm: this.rawNumber(body.highwayKm, 'Distance to it', 0, 500),
      landUse: pick(body.landUse, LAND_USES) ?? null, features,
      clearHeightFt: kind === 'BUILT' ? i.optionalNumber('clearHeightFt', 'Clear height', 6, 200) : null,
      powerKva: kind === 'BUILT' || kind === 'INDUSTRIAL' ? i.optionalNumber('powerKva', 'Power load', 1, 100_000) : null,
      docks: kind === 'BUILT' ? i.optionalNumber('docks', 'Loading docks', 0, 200) : null,
      posterIs: i.oneOf('posterIs', 'You are', POSTERS), ...contact, manageHash: hash(token),
    } });
    return { ok: true as const, slug, token };
  }
  private rawNumber(v: unknown, label: string, min: number, max: number): number | null {
    if (v == null || String(v).trim() === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw new BadRequestException(`${label} must be a number between ${min} and ${max}`);
    return n;
  }

  private who(body: Body) {
    const i = new Input(body);
    const { posterName: name, posterPhone: phone } = this.contact(i, { ...body, email: '' });
    if (body.consent !== true && body.consent !== 'on') throw new BadRequestException('Please agree to be called about this');
    return { name, phone, message: i.optionalText('message', 'Message', 600) };
  }
  /** A buyer asks about a listing. It comes to our team; the owner's number is not handed out. */
  async enquire(slug: string, body: Body) {
    if (typeof body.website === 'string' && body.website) return { ok: true as const };
    const l = await this.db.landListing.findFirst({ where: { slug, status: 'LIVE' }, select: { id: true } });
    if (!l) throw new NotFoundException('This listing is no longer open');
    await this.db.landReply.create({ data: { listingId: l.id, ...this.who(body) } });
    return { ok: true as const };
  }

  // ---- Wanted: what companies and buyers are looking for

  private wantedCard = { slug: true, kind: true, deal: true, purpose: true, title: true, details: true, state: true, stateSlug: true, where: true, areaMin: true, areaMax: true, areaUnit: true, budgetInr: true, company: true, showCompany: true, createdAt: true, _count: { select: { replies: true } } } as const;
  private wantedShape(w: { kind: string; purpose: string; areaMin: number; areaMax: number | null; areaUnit: string; budgetInr: bigint | null; company: string | null; showCompany: boolean; _count: { replies: number } } & Record<string, unknown>) {
    const { company, showCompany, _count, budgetInr, ...rest } = w;
    return { ...rest, budgetInr: num(budgetInr), kindLabel: KIND_LABEL[w.kind as Kind], purposeLabel: PURPOSE_LABEL[w.purpose as keyof typeof PURPOSE_LABEL] ?? 'Other use',
      size: w.areaMax && w.areaMax > w.areaMin ? `${areaText(w.areaMin, w.areaUnit).replace(/ [^\d]+$/, '')} to ${areaText(w.areaMax, w.areaUnit)}` : `${areaText(w.areaMin, w.areaUnit)} or more`,
      // The name is shown only when the poster asked for that; otherwise buyers are just "a company".
      by: showCompany && company ? company : null, answers: _count.replies };
  }
  async wantedList(q: { state?: string; kind?: string; take?: number }) {
    const rows = await this.db.landWanted.findMany({ where: { status: 'LIVE', stateSlug: q.state || undefined, kind: pick(q.kind, KINDS) }, orderBy: { decidedAt: 'desc' }, take: Math.min(q.take ?? 24, 60), select: this.wantedCard });
    return { items: rows.map((r) => this.wantedShape(r)) };
  }
  async wantedOne(slug: string) {
    const w = await this.db.landWanted.findFirst({ where: { slug, status: { in: ['LIVE', 'CLOSED'] } }, select: { ...this.wantedCard, status: true } });
    if (!w) throw new NotFoundException('Not found');
    const { status, ...rest } = w;
    return { ...this.wantedShape(rest), closed: status === 'CLOSED' };
  }
  async wantedPost(body: Body) {
    if (typeof body.website === 'string' && body.website) return { ok: true as const, slug: '', token: '' };
    const i = new Input(body);
    const kind = i.oneOf('kind', 'What you need', KINDS);
    const deal = i.oneOf('deal', 'Buy or rent', DEALS);
    const purpose = i.oneOf('purpose', 'What it is for', PURPOSES);
    const state = stateBySlug(String(body.state ?? ''));
    if (!state) throw new BadRequestException('Choose a state');
    const areaUnit = i.oneOf('areaUnit', 'Unit', UNITS);
    const areaMin = i.number('areaMin', 'Smallest size', 0.01, 100_000, false);
    const areaMax = this.rawNumber(body.areaMax, 'Largest size', 0.01, 100_000);
    if (areaMax != null && areaMax < areaMin) throw new BadRequestException('The largest size must not be below the smallest');
    const where = i.optionalText('where', 'Districts or towns', 160);
    if (body.consent !== true && body.consent !== 'on') throw new BadRequestException('Please confirm this is a real requirement');
    const title = `${PURPOSE_LABEL[purpose]}: ${KIND_LABEL[kind].toLowerCase()} wanted ${deal === 'LEASE' ? 'on rent' : 'to buy'} in ${where ? `${where}, ` : ''}${state.name}`.slice(0, 200);
    const token = randomBytes(24).toString('base64url');
    const slug = await this.slug(title, (s) => this.db.landWanted.findUnique({ where: { slug: s }, select: { id: true } }));
    const contact = this.contact(i, body);
    if ((await this.db.landWanted.count({ where: { posterPhone: contact.posterPhone, status: 'PENDING' } })) >= 5) throw new BadRequestException('You have five requirements waiting for our team. Please wait for those to be looked at.');
    await this.db.landWanted.create({ data: { slug, kind, deal, purpose, title, details: i.optionalText('details', 'Details', 1_000), stateSlug: state.slug, state: state.name, where, areaMin, areaMax, areaUnit,
      budgetInr: this.price(i, 'budgetInr', 'Budget'), company: i.optionalText('company', 'Company', 100), showCompany: body.showCompany === true || body.showCompany === 'on', ...contact, manageHash: hash(token) } });
    return { ok: true as const, slug, token };
  }
  /** An owner says "I have land like this". */
  async answer(slug: string, body: Body) {
    if (typeof body.website === 'string' && body.website) return { ok: true as const };
    const w = await this.db.landWanted.findFirst({ where: { slug, status: 'LIVE' }, select: { id: true } });
    if (!w) throw new NotFoundException('This requirement is no longer open');
    await this.db.landReply.create({ data: { wantedId: w.id, ...this.who(body) } });
    return { ok: true as const };
  }

  // ---- The poster's private link

  private async mine(token: string) {
    const h = hash(String(token).slice(0, 80));
    const [l, w] = await Promise.all([
      this.db.landListing.findUnique({ where: { manageHash: h }, select: { id: true, slug: true, title: true, status: true, decisionNote: true, photos: PHOTOS, _count: { select: { replies: true } } } }),
      this.db.landWanted.findUnique({ where: { manageHash: h }, select: { id: true, slug: true, title: true, status: true, decisionNote: true, _count: { select: { replies: true } } } }),
    ]);
    if (l) return { type: 'listing' as const, ...l };
    if (w) return { type: 'wanted' as const, ...w, photos: [] as { file: string; width: number; height: number }[] };
    throw new NotFoundException('This link is not valid');
  }
  async manage(token: string) {
    const m = await this.mine(token);
    return { type: m.type, slug: m.slug, title: m.title, status: m.status, note: m.decisionNote, replies: m._count.replies, photos: m.photos, maxPhotos: MAX_LAND_PHOTOS };
  }
  /**
   * The poster adds photos with their private link. Each is decoded and re-encoded before it is stored, which also
   * drops the camera's GPS position. Photos added to a listing that is already showing send it back for checking,
   * so no picture reaches the site unseen.
   */
  async addPhotos(token: string, files: { buffer: Buffer; size: number }[]) {
    const m = await this.mine(token);
    if (m.type !== 'listing') throw new BadRequestException('Photos can be added to a listing only');
    if (m.status !== 'PENDING' && m.status !== 'LIVE') throw new BadRequestException('This listing is closed');
    if (!files?.length) throw new BadRequestException('Choose at least one photo');
    if (m.photos.length + files.length > MAX_LAND_PHOTOS) throw new BadRequestException(`A listing can have at most ${MAX_LAND_PHOTOS} photos; this one has ${m.photos.length}`);
    if (files.some((f) => !sniffImage(f.buffer))) throw new BadRequestException('Photos must be JPEG, PNG or WebP images');
    if (files.some((f) => f.size > MAX_PHOTO_BYTES)) throw new BadRequestException('Each photo must be under 5 MB');
    const processed: ProcessedPhoto[] = [];
    for (const f of files) {
      try { processed.push(await processPhoto(f.buffer)); } catch { throw new BadRequestException('One of the photos could not be read. Save it again as a JPEG or PNG and retry.'); }
    }
    const last = await this.db.photo.aggregate({ where: { landId: m.id }, _max: { position: true } });
    let position = (last._max.position ?? -1) + 1;
    for (const ph of processed) await this.db.photo.create({ data: { landId: m.id, file: await savePhoto(ph), width: ph.width, height: ph.height, position: position++ } });
    if (m.status === 'LIVE') await this.db.landListing.update({ where: { id: m.id }, data: { status: 'PENDING' } });
    return { ok: true as const, added: files.length, recheck: m.status === 'LIVE' };
  }
  async removePhoto(token: string, file: string) {
    const m = await this.mine(token);
    const photo = m.type === 'listing' ? await this.db.photo.findFirst({ where: { landId: m.id, file: String(file) }, select: { id: true, file: true } }) : null;
    if (!photo) throw new NotFoundException('Not found');
    await this.db.photo.delete({ where: { id: photo.id } });
    await removePhoto(photo.file);
    return { ok: true as const };
  }
  async close(token: string) {
    const m = await this.mine(token);
    const data = { status: 'CLOSED' };
    if (m.type === 'listing') await this.db.landListing.update({ where: { id: m.id }, data }); else await this.db.landWanted.update({ where: { id: m.id }, data });
    return { ok: true as const };
  }

  // ---- Our team

  async queue(status?: string) {
    const s = pick(status, ['PENDING', 'LIVE', 'REJECTED', 'CLOSED'] as const) ?? 'PENDING';
    const [listings, wanted] = await Promise.all([
      this.db.landListing.findMany({ where: { status: s }, orderBy: { createdAt: 'desc' }, take: 100, include: { photos: PHOTOS } }),
      this.db.landWanted.findMany({ where: { status: s }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    return {
      listings: listings.map(({ manageHash: _h, priceInr, ...l }) => ({ ...l, priceInr: num(priceInr), area: areaText(l.areaValue, l.areaUnit), rate: rate({ ...l, priceInr: num(priceInr) }), features: l.features.map((f) => FEATURES[f]).filter(Boolean) })),
      wanted: wanted.map(({ manageHash: _h, budgetInr, ...w }) => ({ ...w, budgetInr: num(budgetInr) })),
    };
  }
  /** Approve or refuse. On approval staff may correct the district, so one district does not end up as two pages. */
  async decide(type: string, id: string, body: Body) {
    const i = new Input(body);
    const decision = i.oneOf('decision', 'Decision', ['LIVE', 'REJECTED'] as const);
    const data = { status: decision, decisionNote: i.optionalText('note', 'Reason', 300), decidedAt: new Date() };
    if (type === 'wanted') {
      if (!(await this.db.landWanted.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Not found');
      await this.db.landWanted.update({ where: { id }, data });
    } else {
      if (!(await this.db.landListing.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Not found');
      const district = typeof body.district === 'string' && body.district.trim() ? cleanDistrict(body.district) : null;
      await this.db.landListing.update({ where: { id }, data: { ...data, ...(district ? { district: district.name, districtSlug: district.slug } : {}) } });
    }
    return { ok: true as const };
  }
  replies(status?: string) {
    return this.db.landReply.findMany({ where: { status: status === 'DONE' ? 'DONE' : 'NEW' }, orderBy: { createdAt: 'desc' }, take: 200,
      select: { id: true, name: true, phone: true, message: true, status: true, createdAt: true,
        listing: { select: { slug: true, title: true, posterName: true, posterPhone: true } }, wanted: { select: { slug: true, title: true, posterName: true, posterPhone: true, company: true } } } });
  }
  async replyDone(id: string) { await this.db.landReply.updateMany({ where: { id }, data: { status: 'DONE' } }); return { ok: true as const }; }
  async waiting() {
    const [listings, wanted, replies] = await Promise.all([this.db.landListing.count({ where: { status: 'PENDING' } }), this.db.landWanted.count({ where: { status: 'PENDING' } }), this.db.landReply.count({ where: { status: 'NEW' } })]);
    return { listings, wanted, replies };
  }
}

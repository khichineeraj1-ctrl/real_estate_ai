import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Mailer, SITE_URL } from '../mail/mailer';
import { PrismaService } from '../prisma/prisma.service';

const CODE_MINUTES = 10;
const SESSION_DAYS = 60;
const MAX_TRIES = 5;
const MAX_STATE_BYTES = 20_000;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const same = (a: string, b: string) => timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
export const cleanEmail = (v: unknown): string | null => {
  const email = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 160 ? email : null;
};

/** What a buyer keeps in step across devices: nothing but slugs and short titles. Anything else is dropped. */
export function cleanState(raw: unknown): { ticks: Record<string, string[]>; compare: { homes: { slug: string; title: string }[]; projects: { slug: string; title: string }[] } } {
  const o = (raw && typeof raw === 'object' ? raw : {}) as { ticks?: unknown; compare?: { homes?: unknown; projects?: unknown } };
  const slug = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9-]{1,160}$/.test(v);
  const ticks: Record<string, string[]> = {};
  if (o.ticks && typeof o.ticks === 'object') {
    for (const [k, v] of Object.entries(o.ticks as Record<string, unknown>).slice(0, 100)) {
      if (slug(k) && Array.isArray(v)) { const keys = [...new Set(v.filter((x): x is string => typeof x === 'string' && /^[a-z0-9-]{1,40}$/.test(x)))].slice(0, 30); if (keys.length) ticks[k] = keys; }
    }
  }
  const picks = (v: unknown) => (Array.isArray(v) ? v : []).filter((x): x is { slug: string; title: string } => !!x && slug((x as { slug?: unknown }).slug) && typeof (x as { title?: unknown }).title === 'string').slice(0, 4).map((x) => ({ slug: x.slug, title: x.title.slice(0, 120) }));
  return { ticks, compare: { homes: picks(o.compare?.homes), projects: picks(o.compare?.projects) } };
}

@Injectable()
export class BuyerService {
  constructor(private readonly db: PrismaService, private readonly mail: Mailer) {}

  /** Emails a six-digit sign-in code. The answer is the same whether or not the address has an account. */
  async sendCode(rawEmail: unknown) {
    const email = cleanEmail(rawEmail);
    if (!email) throw new BadRequestException('Enter a valid email address');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.db.buyerCode.create({ data: { email, codeHash: hash(`${email}:${code}`), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) } });
    await this.mail.send({ to: email, subject: `${code} is your sign-in code`, text: `Your sign-in code is ${code}\n\nIt works once, for ${CODE_MINUTES} minutes. Or open this link on the same device:\n${SITE_URL}/account/sign-in?email=${encodeURIComponent(email)}&code=${code}\n\nIf you did not ask for this, ignore this email; nobody can sign in without the code.` });
    return { ok: true as const };
  }

  /** Checks the newest unused code for the address. A match signs the buyer in, making their account on first use. */
  async verify(rawEmail: unknown, rawCode: unknown) {
    const email = cleanEmail(rawEmail); const code = typeof rawCode === 'string' ? rawCode.replace(/\D/g, '') : '';
    const bad = new UnauthorizedException('That code is wrong or has expired. Ask for a new one.');
    if (!email || code.length !== 6) throw bad;
    const row = await this.db.buyerCode.findFirst({ where: { email, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!row || row.attempts >= MAX_TRIES) throw bad;
    if (!same(row.codeHash, hash(`${email}:${code}`))) { await this.db.buyerCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } }); throw bad; }
    await this.db.buyerCode.updateMany({ where: { email, usedAt: null }, data: { usedAt: new Date() } });
    const buyer = await this.db.buyer.upsert({ where: { email }, update: {}, create: { email } });
    // Enquiries sent earlier with this email, before there was an account, become theirs to see.
    await this.db.enquiry.updateMany({ where: { email, buyerId: null }, data: { buyerId: buyer.id } });
    const token = randomBytes(32).toString('base64url');
    await this.db.buyerSession.create({ data: { tokenHash: hash(token), buyerId: buyer.id, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) } });
    return { token, email };
  }

  /** The buyer a session token belongs to, or null. Used to guard every /me route and to attach an enquiry. */
  async fromToken(header: string | undefined): Promise<{ id: string; email: string } | null> {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (token.length < 20) return null;
    const s = await this.db.buyerSession.findUnique({ where: { tokenHash: hash(token) }, select: { expiresAt: true, buyer: { select: { id: true, email: true } } } });
    return s && s.expiresAt > new Date() ? s.buyer : null;
  }
  async need(header: string | undefined) {
    const b = await this.fromToken(header);
    if (!b) throw new UnauthorizedException('Sign in to continue');
    return b;
  }
  async signOut(header: string | undefined) {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (token) await this.db.buyerSession.deleteMany({ where: { tokenHash: hash(token) } });
    return { ok: true as const };
  }

  /** Everything on the buyer's account page. */
  async me(buyerId: string) {
    const place = { select: { name: true, city: { select: { slug: true, name: true } } } } as const;
    const cover = { orderBy: { position: 'asc' }, take: 1, select: { file: true, width: true, height: true } } as const;
    const [buyer, saved, enquiries] = await Promise.all([
      this.db.buyer.findUniqueOrThrow({ where: { id: buyerId }, select: { email: true, state: true, createdAt: true } }),
      this.db.savedItem.findMany({
        where: { buyerId }, orderBy: { createdAt: 'desc' },
        select: { note: true, createdAt: true, project: { select: { slug: true, name: true, builder: true, brand: { select: { slug: true, name: true } }, registerStatus: true, registerValidUntil: true, locality: place, photos: cover } }, property: { select: { slug: true, title: true, priceInr: true, areaSqft: true, bhk: true, state: true, locality: place, photos: cover } } },
      }),
      this.db.enquiry.findMany({
        where: { buyerId }, orderBy: { createdAt: 'desc' }, take: 50,
        select: { createdAt: true, wantsVisit: true, project: { select: { slug: true, name: true } }, property: { select: { slug: true, title: true, state: true } }, assignedTo: { select: { name: true, phone: true } } },
      }),
    ]);
    return {
      email: buyer.email, since: buyer.createdAt, state: cleanState(buyer.state),
      saved: saved.map((x) => (x.project
        ? { kind: 'project' as const, slug: x.project.slug, name: x.project.name, sub: `${x.project.brand?.name ?? x.project.builder} · ${x.project.locality.name}, ${x.project.locality.city.name}`, city: x.project.locality.city.slug, brand: x.project.brand?.slug ?? null, photo: x.project.photos[0] ?? null, registerStatus: x.project.registerStatus, registerValidUntil: x.project.registerValidUntil, note: x.note, savedAt: x.createdAt }
        : x.property && x.property.state === 'PUBLISHED'
          ? { kind: 'property' as const, slug: x.property.slug, name: x.property.title, sub: `${x.property.locality.name}, ${x.property.locality.city.name}`, priceInr: x.property.priceInr, photo: x.property.photos[0] ?? null, note: x.note, savedAt: x.createdAt }
          : null)).filter((x): x is NonNullable<typeof x> => x !== null),
      // The buyer sees what they asked about and who was to call; our own follow-up notes stay with us.
      enquiries: enquiries.map((e) => ({
        at: e.createdAt, wantsVisit: e.wantsVisit,
        about: e.property && e.property.state === 'PUBLISHED' ? { kind: 'property' as const, slug: e.property.slug, name: e.property.title } : e.project ? { kind: 'project' as const, slug: e.project.slug, name: e.project.name } : null,
        agent: e.assignedTo ? { name: e.assignedTo.name, phone: e.assignedTo.phone } : null,
      })),
    };
  }

  private async target(kind: unknown, slug: unknown) {
    if (typeof slug !== 'string' || (kind !== 'project' && kind !== 'property')) throw new BadRequestException('Choose a project or a home to save');
    const row = kind === 'project' ? await this.db.project.findUnique({ where: { slug }, select: { id: true } }) : await this.db.property.findFirst({ where: { slug, state: 'PUBLISHED' }, select: { id: true } });
    if (!row) throw new NotFoundException('That page no longer exists');
    return kind === 'project' ? { projectId: row.id } : { propertyId: row.id };
  }

  /** Saves a project or home, or changes its note. Saving twice is the same as once. */
  async save(buyerId: string, body: { kind?: unknown; slug?: unknown; note?: unknown }) {
    const t = await this.target(body.kind, body.slug);
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : undefined;
    const existing = await this.db.savedItem.findFirst({ where: { buyerId, ...t }, select: { id: true } });
    if (existing) { if (note !== undefined) await this.db.savedItem.update({ where: { id: existing.id }, data: { note } }); }
    else {
      if ((await this.db.savedItem.count({ where: { buyerId } })) >= 200) throw new BadRequestException('You have saved 200 already. Remove some to save more.');
      await this.db.savedItem.create({ data: { buyerId, ...t, note: note ?? null } });
    }
    return { ok: true as const };
  }
  async unsave(buyerId: string, kind: string, slug: string) {
    const t = await this.target(kind, slug).catch(() => null);
    if (t) await this.db.savedItem.deleteMany({ where: { buyerId, ...t } });
    return { ok: true as const };
  }

  async setState(buyerId: string, raw: unknown) {
    const state = cleanState(raw);
    if (JSON.stringify(state).length > MAX_STATE_BYTES) throw new BadRequestException('Too much to save');
    await this.db.buyer.update({ where: { id: buyerId }, data: { state } });
    return { ok: true as const, state };
  }

  /** Deletes the account and everything in it. Enquiries already sent stay with the people they were sent to. */
  async remove(buyerId: string) {
    await this.db.buyer.delete({ where: { id: buyerId } });
    return { ok: true as const };
  }
}

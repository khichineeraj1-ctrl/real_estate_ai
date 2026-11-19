import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { cleanEmail } from '../buyer/buyer.service';
import { Mailer, SITE_URL } from '../mail/mailer';
import { PrismaService } from '../prisma/prisma.service';

export type AlertKind = 'PROJECTS' | 'HOMES';
export interface AlertSpec { kind: AlertKind; city: string; locality: string | null; maxPriceInr: number | null; bhk: number | null }
const CHECK_EVERY_MS = 10 * 60_000;
const MAX_PER_EMAIL = 20;
const inr = (n: number) => (n >= 1e7 ? `₹${+(n / 1e7).toFixed(2)} crore` : `₹${+(n / 1e5).toFixed(1)} lakh`);

/** What an alert watches for, in words: "New 3 BHK homes under ₹1.5 crore in Whitefield, Bengaluru". */
export function alertLabel(a: AlertSpec, place: { city: string; locality?: string | null }): string {
  const where = place.locality ? `${place.locality}, ${place.city}` : place.city;
  if (a.kind === 'PROJECTS') return `New projects on the RERA register in ${where}`;
  return `New ${a.bhk ? `${a.bhk} BHK ` : ''}homes${a.maxPriceInr ? ` under ${inr(a.maxPriceInr)}` : ''} in ${where}`;
}

/** Reads what the form sent into an alert, refusing anything that is not one. */
export function readAlert(b: Record<string, unknown>): AlertSpec {
  const kind = b.kind === 'HOMES' ? 'HOMES' : b.kind === 'PROJECTS' ? 'PROJECTS' : null;
  const slug = (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]{1,80}$/.test(v) ? v : null);
  const whole = (v: unknown, min: number, max: number) => { const n = Number(v); return v !== '' && v != null && Number.isInteger(n) && n >= min && n <= max ? n : null; };
  const city = slug(b.city);
  if (!kind || !city) throw new BadRequestException('Choose what to be told about, and where');
  return { kind, city, locality: slug(b.locality), maxPriceInr: kind === 'HOMES' ? whole(b.maxPrice, 100_000, 2_000_000_000) : null, bhk: kind === 'HOMES' ? whole(b.bhk, 1, 10) : null };
}

/** The email for one alert's new matches. Long lists are cut to the first ten, with the count. */
export function alertEmail(label: string, items: { name: string; url: string; line?: string }[], pageUrl: string, stopUrl: string): { subject: string; text: string } {
  const n = items.length;
  const shown = items.slice(0, 10).map((x) => `• ${x.name}${x.line ? ` (${x.line})` : ''}\n  ${x.url}`).join('\n');
  return {
    subject: `${n} new: ${label.replace(/^New /, '')}`,
    text: `You asked to be told about: ${label}.\n\n${n === 1 ? 'One has appeared' : `${n} have appeared`} since we last wrote:\n\n${shown}${n > 10 ? `\n\n…and ${n - 10} more: ${pageUrl}` : ''}\n\nSee them all: ${pageUrl}\n\nTo stop this alert: ${stopUrl}`,
  };
}

@Injectable()
export class AlertService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('Alerts');
  private timer: NodeJS.Timeout | null = null;
  constructor(private readonly db: PrismaService, private readonly mail: Mailer) {}

  onModuleInit() {
    if (process.env.ALERTS === 'off') return;
    this.timer = setInterval(() => { this.notifyNew().catch((e: Error) => this.log.error(`Alert check failed: ${e.message}`)); }, CHECK_EVERY_MS);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private async place(a: { citySlug: string; localitySlug: string | null }) {
    const city = await this.db.city.findUnique({ where: { slug: a.citySlug }, select: { name: true } });
    const locality = a.localitySlug ? await this.db.locality.findFirst({ where: { slug: a.localitySlug, city: { slug: a.citySlug } }, select: { name: true } }) : null;
    return city && (!a.localitySlug || locality) ? { city: city.name, locality: locality?.name ?? null } : null;
  }

  /** Starts an alert. A signed-in buyer's is tied to their account; anyone else gives an email. Asking twice changes nothing. */
  async create(body: Record<string, unknown>, buyer: { id: string; email: string } | null) {
    if (typeof body.website === 'string' && body.website) return { ok: true as const, label: '' }; // a field people never see
    const email = buyer?.email ?? cleanEmail(body.email);
    if (!email) throw new BadRequestException('Enter a valid email address');
    if (!buyer && body.consent !== true && body.consent !== 'on') throw new BadRequestException('Please agree to be emailed');
    const spec = readAlert(body);
    const place = await this.place({ citySlug: spec.city, localitySlug: spec.locality });
    if (!place) throw new NotFoundException('We do not cover that place');
    const label = alertLabel(spec, place);
    const same = { email, kind: spec.kind, citySlug: spec.city, localitySlug: spec.locality, maxPriceInr: spec.maxPriceInr, bhk: spec.bhk };
    const existing = await this.db.searchAlert.findFirst({ where: same, select: { id: true } });
    if (existing) return { ok: true as const, label };
    if ((await this.db.searchAlert.count({ where: { email } })) >= MAX_PER_EMAIL) throw new BadRequestException(`You already have ${MAX_PER_EMAIL} alerts. Stop one to add another.`);
    const made = await this.db.searchAlert.create({ data: { ...same, buyerId: buyer?.id ?? null, token: randomBytes(24).toString('base64url') } });
    await this.mail.send({ to: email, subject: 'Your alert is set', text: `We will email you when there is something new for: ${label}.\n\nTo stop this alert: ${SITE_URL}/unfollow?token=${made.token}` });
    return { ok: true as const, label };
  }

  /** The link in an alert email. */
  async stop(token: string) {
    return (await this.db.searchAlert.deleteMany({ where: { token: String(token).slice(0, 80) } })).count;
  }

  /** A buyer's alerts and followed projects, for their account page: by account, or by the same email. */
  async mine(buyer: { id: string; email: string }) {
    const [alerts, follows] = await Promise.all([
      this.db.searchAlert.findMany({ where: { OR: [{ buyerId: buyer.id }, { email: buyer.email }] }, orderBy: { createdAt: 'desc' } }),
      this.db.projectWatch.findMany({ where: { email: buyer.email }, orderBy: { createdAt: 'desc' }, select: { id: true, project: { select: { slug: true, name: true } } } }),
    ]);
    const labelled = await Promise.all(alerts.map(async (a) => { const place = await this.place(a); return place ? { id: a.id, label: alertLabel({ kind: a.kind as AlertKind, city: a.citySlug, locality: a.localitySlug, maxPriceInr: a.maxPriceInr, bhk: a.bhk }, place), path: `/${a.citySlug}${a.localitySlug ? `/${a.localitySlug}` : ''}` } : null; }));
    return { alerts: labelled.filter((x): x is NonNullable<typeof x> => x !== null), follows: follows.map((f) => ({ id: f.id, slug: f.project.slug, name: f.project.name })) };
  }
  async removeMine(buyer: { id: string; email: string }, kind: 'alert' | 'follow', id: string) {
    if (kind === 'alert') await this.db.searchAlert.deleteMany({ where: { id, OR: [{ buyerId: buyer.id }, { email: buyer.email }] } });
    else await this.db.projectWatch.deleteMany({ where: { id, email: buyer.email } });
    return { ok: true as const };
  }

  /** Tells each alert's owner what has appeared since it last looked, in one email, then moves its clock on. */
  async notifyNew(now = new Date()): Promise<number> {
    const alerts = await this.db.searchAlert.findMany();
    let sent = 0;
    for (const a of alerts) {
      const where = { locality: { ...(a.localitySlug ? { slug: a.localitySlug } : {}), city: { slug: a.citySlug } } };
      const items = a.kind === 'PROJECTS'
        ? (await this.db.project.findMany({ where: { ...where, createdAt: { gt: a.checkedAt, lte: now } }, orderBy: { createdAt: 'desc' }, take: 50, select: { slug: true, name: true, builder: true, brand: { select: { name: true } }, locality: { select: { name: true } } } }))
          .map((p) => ({ name: p.name, url: `${SITE_URL}/projects/${p.slug}`, line: `${p.brand?.name ?? p.builder}, ${p.locality.name}` }))
        : (await this.db.property.findMany({ where: { ...where, state: 'PUBLISHED', postedAt: { gt: a.checkedAt, lte: now }, ...(a.maxPriceInr ? { priceInr: { lte: a.maxPriceInr } } : {}), ...(a.bhk ? { bhk: a.bhk } : {}) }, orderBy: { postedAt: 'desc' }, take: 50, select: { slug: true, title: true, priceInr: true, locality: { select: { name: true } } } }))
          .map((h) => ({ name: h.title, url: `${SITE_URL}/property/${h.slug}`, line: `${inr(h.priceInr)}, ${h.locality.name}` }));
      if (items.length) {
        const place = await this.place(a);
        if (place) {
          const label = alertLabel({ kind: a.kind as AlertKind, city: a.citySlug, locality: a.localitySlug, maxPriceInr: a.maxPriceInr, bhk: a.bhk }, place);
          const mail = alertEmail(label, items, `${SITE_URL}/${a.citySlug}${a.localitySlug ? `/${a.localitySlug}` : ''}`, `${SITE_URL}/unfollow?token=${a.token}`);
          await this.mail.send({ to: a.email, ...mail });
          sent += 1;
        }
      }
      await this.db.searchAlert.update({ where: { id: a.id }, data: { checkedAt: now } });
    }
    if (sent) this.log.log(`${sent} alert email(s) about new projects or homes.`);
    return sent;
  }
}

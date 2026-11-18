import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Mailer, SITE_URL } from '../mail/mailer';
import { PrismaService } from '../prisma/prisma.service';

const JOB = 'lead-reminders';
const WAIT_HOURS = 24; // a lead is "left waiting" once it has been New this long
const LOOK_BACK_DAYS = 30; // older leads are not nagged about for ever
const CHECK_EVERY_MS = 10 * 60_000;

export interface ReminderSummary { to: string; who: 'seller' | 'builder' | 'staff'; leads: number; sent: boolean }

type Lead = Prisma.EnquiryGetPayload<{ include: { property: { select: { title: true } }; project: { select: { name: true } } } }>;

/**
 * Once a day, emails each seller, builder and staff member the leads on their own track that are still New a day
 * after arriving. Sellers and builders are reminded about their leads; staff about leads nobody else is handling.
 * Set REMINDERS=off to disable, REMINDER_HOUR_IST (0-23, default 9) to change the time.
 */
@Injectable()
export class Reminders implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('Reminders');
  private timer: NodeJS.Timeout | null = null;
  constructor(private readonly db: PrismaService, private readonly mail: Mailer) {}

  onModuleInit() {
    if (process.env.REMINDERS === 'off') { this.log.log('Daily lead reminders are off (REMINDERS=off).'); return; }
    this.timer = setInterval(() => { this.tick().catch((e: Error) => this.log.error(`Reminder check failed: ${e.message}`)); }, CHECK_EVERY_MS);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  /** India time, which has no daylight saving, so a fixed offset is exact. */
  private india(now: Date) {
    const t = new Date(now.getTime() + 5.5 * 3_600_000);
    return { day: t.toISOString().slice(0, 10), hour: t.getUTCHours() };
  }

  private async tick(now = new Date()) {
    const { day, hour } = this.india(now);
    const at = Number(process.env.REMINDER_HOUR_IST ?? 9);
    if (hour < (Number.isInteger(at) && at >= 0 && at <= 23 ? at : 9)) return;
    if (!(await this.claim(day))) return;
    const summary = await this.run(true, now);
    this.log.log(`Sent ${summary.filter((s) => s.sent).length} of ${summary.length} reminder emails for ${day}.`);
  }

  /** True for exactly one caller per day, however many API servers are running or how often they restart. */
  private async claim(day: string): Promise<boolean> {
    const moved = await this.db.jobRun.updateMany({ where: { name: JOB, lastDay: { not: day } }, data: { lastDay: day } });
    if (moved.count) return true;
    try { await this.db.jobRun.create({ data: { name: JOB, lastDay: day } }); return true; } catch { return false; } // already claimed today
  }

  /** Works out who is due a reminder and, when `send` is true, emails them. Also used by the admin "run now" endpoint. */
  async run(send: boolean, now = new Date()): Promise<ReminderSummary[]> {
    const waiting: Prisma.EnquiryWhereInput = { createdAt: { lt: new Date(now.getTime() - WAIT_HOURS * 3_600_000), gte: new Date(now.getTime() - LOOK_BACK_DAYS * 86_400_000) } };
    const include = { property: { select: { title: true, owner: { select: { id: true, name: true, email: true, role: true, active: true } } } }, project: { select: { name: true, account: { select: { id: true, name: true, email: true, active: true } } } } };
    const [partnerLeads, staffLeads, staff] = await Promise.all([
      this.db.enquiry.findMany({ where: { ...waiting, partnerStatus: 'NEW' }, include, orderBy: { createdAt: 'asc' } }),
      this.db.enquiry.findMany({ where: { ...waiting, status: 'NEW' }, include, orderBy: { createdAt: 'asc' } }),
      this.db.user.findMany({ where: { role: { in: ['ADMIN', 'EDITOR'] }, active: true }, select: { name: true, email: true } }),
    ]);

    // The outside party a lead belongs to: a seller with their own account, else the project's builder login, else nobody.
    const seller = (e: (typeof partnerLeads)[number]) => (e.property?.owner?.role === 'AGENT' && e.property.owner.active ? e.property.owner : null);
    const builder = (e: (typeof partnerLeads)[number]) => (e.property?.owner?.role === 'AGENT' ? null : e.project?.account?.active ? e.project.account : null);

    const groups = new Map<string, { to: string; name: string; who: 'seller' | 'builder'; leads: Lead[] }>();
    for (const e of partnerLeads) {
      const s = seller(e);
      const person = s ?? builder(e);
      if (!person) continue;
      const g = groups.get(person.id) ?? { to: person.email, name: person.name, who: s ? 'seller' as const : 'builder' as const, leads: [] };
      g.leads.push(e);
      groups.set(person.id, g);
    }
    // Staff are only chased for leads that have no seller or builder to follow them up.
    const unowned = staffLeads.filter((e) => !seller(e) && !builder(e));

    const out: ReminderSummary[] = [];
    for (const g of groups.values()) {
      out.push({ to: g.to, who: g.who, leads: g.leads.length, sent: send && (await this.mail.send({ to: g.to, ...this.compose(g.name, g.leads, g.who === 'seller' ? 'your listings' : 'your projects') })) });
    }
    if (unowned.length) {
      for (const person of staff) {
        out.push({ to: person.email, who: 'staff', leads: unowned.length, sent: send && (await this.mail.send({ to: person.email, ...this.compose(person.name, unowned, 'listings and projects with no seller or builder login') })) });
      }
    }
    return out;
  }

  private compose(name: string, leads: Lead[], about: string) {
    const n = leads.length;
    const lines = leads.slice(0, 10).map((e) => `- ${e.name}, about ${e.property?.title ?? e.project?.name ?? 'a project'} (received ${e.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })})`);
    return {
      subject: `${n} ${n === 1 ? 'lead is' : 'leads are'} still waiting for a call`,
      text: `Hello ${name},\n\n${n} ${n === 1 ? 'buyer' : 'buyers'} who asked about ${about} more than a day ago ${n === 1 ? 'is' : 'are'} still marked New:\n\n${lines.join('\n')}${n > 10 ? `\n…and ${n - 10} more` : ''}\n\nCall them, then set the status so they drop off this list:\n${SITE_URL}/admin/enquiries?status=NEW`,
    };
  }
}

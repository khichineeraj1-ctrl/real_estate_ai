import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Mailer, SITE_URL } from '../mail/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { standingOf } from './insights';

interface Snapshot { status: string | null; validUntil: Date | null }
const monthYear = (d: Date) => d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * What changed in a registration between two readings of the register, in a sentence, or null when nothing a buyer
 * would act on has changed. (A date simply passing is noticed separately, when followers are told.)
 */
export function changeNote(before: Snapshot, after: Snapshot, now = new Date()): string | null {
  const was = standingOf({ registerStatus: before.status, registerValidUntil: before.validUntil }, now);
  const is = standingOf({ registerStatus: after.status, registerValidUntil: after.validUntil }, now);
  if (is === 'lapsed' && was !== 'lapsed') return 'The register now marks its registration as lapsed. Do not pay anything more until the builder shows you an extension order.';
  if (was === 'lapsed' && is !== 'lapsed') return `The register no longer marks its registration as lapsed${after.validUntil ? `; it now runs to ${monthYear(after.validUntil)}` : ''}.`;
  const moved = before.validUntil?.getTime() !== after.validUntil?.getTime();
  if (moved && after.validUntil && before.validUntil) return after.validUntil > before.validUntil
    ? `Its registration has been extended, from ${monthYear(before.validUntil)} to ${monthYear(after.validUntil)}. That is a later completion date: ask the builder what it means for your possession date.`
    : `The end of its registration has moved earlier, from ${monthYear(before.validUntil)} to ${monthYear(after.validUntil)}.`;
  if (moved && after.validUntil) return `The register now shows its registration running to ${monthYear(after.validUntil)}.`;
  return null;
}

@Injectable()
export class WatchService {
  private log = new Logger('Watch');
  constructor(private readonly db: PrismaService, private readonly mail: Mailer) {}

  /** Start following a project. Following twice is the same as once. */
  async follow(slug: string, body: Record<string, unknown>) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) throw new BadRequestException('Enter a valid email address');
    if (body.consent !== true && body.consent !== 'on') throw new BadRequestException('Please agree to be emailed about this project');
    if (typeof body.website === 'string' && body.website) return { ok: true as const }; // a field people never see; only scripts fill it
    const project = await this.db.project.findUnique({ where: { slug }, select: { id: true, name: true, registerStatus: true, registerValidUntil: true } });
    if (!project) throw new NotFoundException('Project not found');
    const token = randomBytes(24).toString('base64url');
    const made = await this.db.projectWatch.upsert({
      where: { email_projectId: { email, projectId: project.id } }, update: {},
      create: { email, projectId: project.id, token, lastStatus: project.registerStatus, lastValidUntil: project.registerValidUntil },
    });
    if (made.token === token) {
      await this.mail.send({ to: email, subject: `You are following ${project.name}`, text: `We will email you if the RERA registration of ${project.name} changes: if it lapses, is extended, or reaches its end date.\n\nThe project: ${SITE_URL}/projects/${slug}\n\nTo stop these emails: ${SITE_URL}/unfollow?token=${made.token}` });
    }
    return { ok: true as const };
  }

  async unfollow(token: string) {
    const gone = await this.db.projectWatch.deleteMany({ where: { token: String(token).slice(0, 80) } });
    return { ok: true as const, removed: gone.count };
  }

  /** After the registers are read: tell each follower whose project's registration has changed, once per change. */
  async notifyChanges(now = new Date()): Promise<number> {
    const watches = await this.db.projectWatch.findMany({ include: { project: { select: { slug: true, name: true, registerStatus: true, registerValidUntil: true } } } });
    let sent = 0;
    for (const w of watches) {
      const after = { status: w.project.registerStatus, validUntil: w.project.registerValidUntil };
      // A date that passed since we last wrote is noticed by comparing from the last time we looked.
      const note = changeNote({ status: w.lastStatus, validUntil: w.lastValidUntil }, after, now);
      const passed = !note && after.validUntil && after.validUntil < now && (w.notifiedAt ?? w.createdAt) < after.validUntil && !/lapsed/i.test(after.status ?? '')
        ? `The completion date the builder gave RERA (${monthYear(after.validUntil)}) has now passed. If you are waiting for possession, ask for the occupation certificate or the extension order.` : null;
      const text = note ?? passed;
      if (!text) continue;
      await this.mail.send({ to: w.email, subject: `${w.project.name}: its RERA registration has changed`, text: `You asked us to tell you about ${w.project.name}.\n\n${text}\n\nSee the project and what to check before paying: ${SITE_URL}/projects/${w.project.slug}\n\nTo stop these emails: ${SITE_URL}/unfollow?token=${w.token}` });
      await this.db.projectWatch.update({ where: { id: w.id }, data: { lastStatus: after.status, lastValidUntil: after.validUntil, notifiedAt: now } });
      sent += 1;
    }
    if (sent) this.log.log(`${sent} follower(s) told about a changed registration.`);
    return sent;
  }
}

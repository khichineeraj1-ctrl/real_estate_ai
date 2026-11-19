import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Input, slugify } from '../admin/input';
import { youtubeId } from '../admin/photos';
import { cleanEmail } from '../buyer/buyer.service';
import { Mailer, SITE_URL } from '../mail/mailer';
import { PrismaService } from '../prisma/prisma.service';

interface Submitter { id: string; role: string; name: string }

/**
 * Words that turn information into an offer. An upcoming project is not registered, so it may not be priced, booked
 * or sold; text that does any of that is refused, with the reason, before a person ever has to judge it.
 */
const SELLING = /₹|\brs\.?\s?\d|\binr\b|\blakhs?\b|\blacs?\b|\bcrores?\b|\bcr\b|\bper\s*sq|\bpsf\b|\bprice|\bbook(ing|ed)?\b|\btoken\b|\bemi\b|\bdiscount|\boffer|\bpre[- ]?launch (price|rate)|\breturns?\b|\bassured|\bguarantee/i;
export function sellingWords(text: string | null): string | null {
  const m = text ? SELLING.exec(text) : null;
  return m ? m[0].trim() : null;
}

/** What buyers are told about an upcoming project, the same wherever it appears. */
export const UPCOMING_NOTICE = 'Not yet registered with RERA, so it is not for sale. A builder may not advertise, price or take bookings for a project before it is registered. This is information only.';

@Injectable()
export class UpcomingService {
  constructor(private readonly db: PrismaService, private readonly mail: Mailer) {}

  private card = { slug: true, name: true, builder: true, about: true, expected: true, youtubeId: true, videoTitle: true, createdAt: true, locality: { select: { slug: true, name: true, city: { select: { slug: true, name: true } } } }, submittedBy: { select: { name: true, role: true, dealer: { select: { firmName: true } } } }, _count: { select: { watches: true } } } as const;
  private shape<T extends { locality: { slug: string; name: string; city: { slug: string; name: string } }; submittedBy: { name: string; role: string; dealer: { firmName: string | null } | null } | null; _count: { watches: number } }>(u: T) {
    const { locality, submittedBy, _count, ...rest } = u;
    return { ...rest, locality: { slug: locality.slug, name: locality.name }, city: locality.city, waiting: _count.watches,
      // Who told us, by role and name only: a builder's own team, or an agent we have verified. Entries our own team added carry no name.
      sharedBy: submittedBy && (submittedBy.role === 'BUILDER' || submittedBy.role === 'AGENT') ? { name: submittedBy.dealer?.firmName || submittedBy.name, as: submittedBy.role === 'BUILDER' ? 'the builder’s team' : 'a verified agent' } : null };
  }

  // ---- For buyers

  /** Approved upcoming projects that have not been registered yet, newest first. */
  async list(city?: string, take = 12) {
    const rows = await this.db.upcomingProject.findMany({ where: { status: 'APPROVED', projectId: null, ...(city ? { locality: { city: { slug: city } } } : {}) }, orderBy: { decidedAt: 'desc' }, take, select: this.card });
    return { notice: UPCOMING_NOTICE, items: rows.map((r) => this.shape(r)) };
  }
  async one(slug: string) {
    const u = await this.db.upcomingProject.findFirst({ where: { slug, status: 'APPROVED' }, select: { ...this.card, project: { select: { slug: true, name: true } } } });
    if (!u) throw new NotFoundException('Not found');
    const { project, ...rest } = u;
    return { ...this.shape(rest), notice: UPCOMING_NOTICE, registeredAs: project };
  }
  /** "Tell me when it is registered." A signed-in buyer needs no email box. */
  async notify(slug: string, body: Record<string, unknown>, buyer: { email: string } | null) {
    if (typeof body.website === 'string' && body.website) return { ok: true as const };
    const email = buyer?.email ?? cleanEmail(body.email);
    if (!email) throw new BadRequestException('Enter a valid email address');
    if (!buyer && body.consent !== true && body.consent !== 'on') throw new BadRequestException('Please agree to be emailed');
    const u = await this.db.upcomingProject.findFirst({ where: { slug, status: 'APPROVED', projectId: null }, select: { id: true, name: true } });
    if (!u) throw new NotFoundException('Not found');
    const token = randomBytes(24).toString('base64url');
    const made = await this.db.upcomingWatch.upsert({ where: { email_upcomingId: { email, upcomingId: u.id } }, update: {}, create: { email, upcomingId: u.id, token } });
    if (made.token === token) await this.mail.send({ to: email, subject: `We will tell you when ${u.name} is registered`, text: `${u.name} is not yet registered with RERA, so it is not for sale. We will email you once, when its registration appears on the register.\n\nTo stop this: ${SITE_URL}/unfollow?token=${made.token}` });
    return { ok: true as const };
  }
  async stop(token: string) { return (await this.db.upcomingWatch.deleteMany({ where: { token: String(token).slice(0, 80) } })).count; }

  // ---- For agents and builders

  /** A verified agent, or a builder's account, tells us about a project that is coming. It waits for our team. */
  async submit(user: Submitter, body: Record<string, unknown>) {
    if (user.role === 'AGENT') {
      const profile = await this.db.dealerProfile.findUnique({ where: { userId: user.id }, select: { status: true } });
      if (profile?.status !== 'APPROVED') throw new ForbiddenException('Get verified first: buyers are only shown upcoming projects from agents our team has verified');
    }
    const i = new Input(body);
    const name = i.text('name', 'Project name', 120); const builder = i.text('builder', 'Builder', 120);
    const about = i.optionalText('about', 'About the project', 600); const expected = i.optionalText('expected', 'Expected launch', 60);
    const videoTitle = i.optionalText('videoTitle', 'Video title', 120);
    for (const [label, text] of [['The project name', name], ['“About the project”', about], ['“Expected launch”', expected], ['The video title', videoTitle]] as const) {
      const word = sellingWords(text);
      if (word) throw new BadRequestException(`${label} mentions “${word}”. A project that is not registered yet cannot be priced, offered or booked, so please describe only where it is and what is planned.`);
    }
    // The form sends the place as "city/locality", the same words as in the site's addresses.
    const [citySlug, localitySlug] = String(body.place ?? '').split('/');
    const locality = citySlug && localitySlug ? await this.db.locality.findFirst({ where: { slug: localitySlug, city: { slug: citySlug } }, select: { id: true, name: true, city: { select: { name: true } } } }) : null;
    if (!locality) throw new BadRequestException('Choose a locality from the list');
    const raw = typeof body.url === 'string' ? body.url.trim() : '';
    const video = raw ? youtubeId(raw) : null;
    if (raw && !video) throw new BadRequestException('Paste a YouTube link, such as https://youtu.be/…');
    if ((await this.db.upcomingProject.count({ where: { submittedById: user.id, status: 'PENDING' } })) >= 5) throw new BadRequestException('You have five waiting for our team. Please wait for those to be looked at.');
    const base = slugify(`${name} ${locality.name} ${locality.city.name}`);
    const slug = (await this.db.upcomingProject.findUnique({ where: { slug: base }, select: { id: true } })) ? `${base.slice(0, 80)}-${randomBytes(3).toString('hex')}` : base;
    const staff = user.role === 'ADMIN' || user.role === 'EDITOR';
    await this.db.upcomingProject.create({ data: { slug, name, builder, about, expected, youtubeId: video, videoTitle, localityId: locality.id, submittedById: user.id, status: staff ? 'APPROVED' : 'PENDING', decidedAt: staff ? new Date() : null } });
    return { ok: true as const };
  }
  mine(user: Submitter) {
    return this.db.upcomingProject.findMany({ where: { submittedById: user.id }, orderBy: { createdAt: 'desc' }, select: { id: true, slug: true, name: true, builder: true, status: true, decisionNote: true, youtubeId: true, createdAt: true, projectId: true, locality: { select: { name: true, city: { select: { name: true } } } }, _count: { select: { watches: true } } } });
  }
  async withdraw(user: Submitter, id: string) {
    await this.db.upcomingProject.deleteMany({ where: { id, submittedById: user.id } });
    return { ok: true as const };
  }

  // ---- For our team

  all(status?: string) {
    const wanted = ['PENDING', 'APPROVED', 'REJECTED'].includes(status ?? '') ? status! : 'PENDING';
    return this.db.upcomingProject.findMany({
      where: { status: wanted }, orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, slug: true, name: true, builder: true, about: true, expected: true, youtubeId: true, videoTitle: true, status: true, decisionNote: true, createdAt: true, locality: { select: { name: true, city: { select: { name: true } } } }, submittedBy: { select: { name: true, email: true, role: true, dealer: { select: { firmName: true } } } }, project: { select: { slug: true, name: true } }, _count: { select: { watches: true } } },
    });
  }
  async decide(id: string, body: Record<string, unknown>) {
    const decision = new Input(body).oneOf('decision', 'Decision', ['APPROVED', 'REJECTED'] as const);
    const u = await this.db.upcomingProject.findUnique({ where: { id }, select: { id: true } });
    if (!u) throw new NotFoundException('Not found');
    await this.db.upcomingProject.update({ where: { id }, data: { status: decision, decisionNote: new Input(body).optionalText('note', 'Reason', 300), decidedAt: new Date() } });
    return { ok: true as const };
  }
  /**
   * The project now has a RERA registration and a page of its own: link the two, tell everyone who asked, once, and
   * take the entry off the upcoming list.
   */
  async registered(id: string, body: Record<string, unknown>) {
    const u = await this.db.upcomingProject.findUnique({ where: { id }, select: { id: true, name: true, projectId: true, watches: { select: { email: true, token: true } } } });
    if (!u) throw new NotFoundException('Not found');
    const project = await this.db.project.findUnique({ where: { slug: String(body.projectSlug ?? '').trim() }, select: { id: true, slug: true, name: true, reraId: true } });
    if (!project?.reraId) throw new BadRequestException('Give the address ending of the registered project’s page, e.g. m3m-altitude-sector-65-gurgaon. It must have a RERA number.');
    await this.db.upcomingProject.update({ where: { id }, data: { projectId: project.id } });
    for (const w of u.watches) {
      await this.mail.send({ to: w.email, subject: `${u.name} is now registered with RERA`, text: `You asked us to tell you when ${u.name} was registered. It now is, as ${project.name}, under RERA number ${project.reraId}.\n\nSee its registration, the builder’s track record and what to check before paying: ${SITE_URL}/projects/${project.slug}\n\nThis is the only email we will send you about it.` });
    }
    await this.db.upcomingWatch.deleteMany({ where: { upcomingId: id } });
    return { ok: true as const, told: u.watches.length };
  }
}

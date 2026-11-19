import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Input, slugify } from '../admin/input';
import { guideBySlug } from '../guides/guides';
import { PrismaService } from '../prisma/prisma.service';

interface Who { id: string; role: string }
const KINDS = ['GUIDE', 'BLOG'] as const;
const isStaff = (u: Who) => u.role === 'ADMIN' || u.role === 'EDITOR';
const MIN_BODY = 300; const MAX_BODY = 30_000;
const WORDS_A_MINUTE = 200;

/** Minutes to read a piece, at an easy pace. */
export const readingMinutes = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).length / WORDS_A_MINUTE));

/**
 * What a piece is made of, as checked text. The body is plain text with a little markup and is never treated as
 * HTML: the site turns "## ", "- ", **bold** and [text](link) into headings, lists, bold and links, and shows the rest
 * as written.
 */
export function readArticle(body: Record<string, unknown>) {
  const i = new Input(body);
  const text = String(body.body ?? '').replace(/\r\n/g, '\n').trim();
  if (text.length < MIN_BODY) throw new BadRequestException(`The piece is too short to publish: write at least ${MIN_BODY} characters`);
  if (text.length > MAX_BODY) throw new BadRequestException(`The piece is too long: keep it under ${MAX_BODY.toLocaleString('en-IN')} characters`);
  if (/<\s*(script|iframe|style|object|embed)\b/i.test(text)) throw new BadRequestException('The piece cannot contain code. Write in plain text; see the formatting help beside the box.');
  return { kind: i.oneOf('kind', 'Kind', KINDS), title: i.text('title', 'Title', 90), summary: i.text('summary', 'Summary', 200), body: text };
}

@Injectable()
export class ArticleService {
  constructor(private readonly db: PrismaService) {}

  // ---- For readers

  /** Published pieces of one kind, newest first, without their bodies. */
  async list(kind: string, take = 60) {
    const k = KINDS.find((x) => x === kind) ?? 'BLOG';
    const rows = await this.db.article.findMany({ where: { status: 'PUBLISHED', kind: k }, orderBy: { publishedAt: 'desc' }, take, select: { slug: true, kind: true, title: true, summary: true, body: true, publishedAt: true, author: { select: { name: true } } } });
    return rows.map(({ body, author, ...r }) => ({ ...r, minutes: readingMinutes(body), by: author?.name ?? null }));
  }
  async one(slug: string) {
    const a = await this.db.article.findFirst({ where: { slug, status: 'PUBLISHED' }, select: { slug: true, kind: true, title: true, summary: true, body: true, publishedAt: true, updatedAt: true, author: { select: { name: true } } } });
    if (!a) throw new NotFoundException('Not found');
    const { author, ...rest } = a;
    const more = (await this.list(a.kind, 7)).filter((x) => x.slug !== slug).slice(0, 4);
    return { ...rest, minutes: readingMinutes(a.body), by: author?.name ?? null, more };
  }

  // ---- For writers and the team

  /** A writer sees their own pieces; the team sees everyone's, optionally by status. */
  mine(user: Who, status?: string) {
    const where = { ...(isStaff(user) ? {} : { authorId: user.id }), ...(['DRAFT', 'SUBMITTED', 'PUBLISHED'].includes(status ?? '') ? { status } : {}) };
    return this.db.article.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 200, select: { id: true, slug: true, kind: true, title: true, status: true, reviewNote: true, updatedAt: true, publishedAt: true, author: { select: { name: true } } } });
  }
  private async row(user: Who, id: string) {
    const a = await this.db.article.findUnique({ where: { id } });
    if (!a || (!isStaff(user) && a.authorId !== user.id)) throw new NotFoundException('Not found');
    return a;
  }
  get(user: Who, id: string) { return this.row(user, id); }

  private async freshSlug(title: string, kind: string, except?: string) {
    const base = slugify(title).slice(0, 70) || 'untitled';
    for (let n = 0; n < 50; n++) {
      const slug = n ? `${base}-${n + 1}` : base;
      const taken = await this.db.article.findFirst({ where: { slug, ...(except ? { NOT: { id: except } } : {}) }, select: { id: true } });
      // A writer's guide shares the /guides/ address with the guides written into the product, so it must not take one of theirs.
      if (!taken && !(kind === 'GUIDE' && guideBySlug(slug))) return slug;
    }
    throw new BadRequestException('Choose a more distinctive title');
  }

  async create(user: Who, body: Record<string, unknown>) {
    const data = readArticle(body);
    const a = await this.db.article.create({ data: { ...data, slug: await this.freshSlug(data.title, data.kind), authorId: user.id } });
    return { id: a.id };
  }
  /** A writer can change a piece until it is published; after that only the team can, so what buyers read is what was approved. */
  async update(user: Who, id: string, body: Record<string, unknown>) {
    const a = await this.row(user, id);
    if (a.status === 'PUBLISHED' && !isStaff(user)) throw new ForbiddenException('This piece is published. Ask an editor to change it, or to take it down so you can.');
    const data = readArticle(body);
    // The address is set from the title while the piece is unpublished, and never changes once buyers may have it.
    const slug = a.status === 'PUBLISHED' ? a.slug : await this.freshSlug(data.title, data.kind, id);
    await this.db.article.update({ where: { id }, data: { ...data, slug } });
    return { ok: true as const };
  }
  async submit(user: Who, id: string) {
    const a = await this.row(user, id);
    if (a.status !== 'DRAFT') throw new BadRequestException(a.status === 'SUBMITTED' ? 'This is already with the team for review' : 'This piece is already published');
    await this.db.article.update({ where: { id }, data: { status: 'SUBMITTED', reviewNote: null } });
    return { ok: true as const };
  }
  /** The team's decision: publish it, send it back with a note, or take a published piece down. */
  async decide(user: Who, id: string, body: Record<string, unknown>) {
    if (!isStaff(user)) throw new ForbiddenException('Only an editor or admin can publish');
    const a = await this.row(user, id);
    const decision = new Input(body).oneOf('decision', 'Decision', ['PUBLISH', 'SEND_BACK', 'TAKE_DOWN'] as const);
    if (decision === 'PUBLISH') await this.db.article.update({ where: { id }, data: { status: 'PUBLISHED', reviewNote: null, publishedAt: a.publishedAt ?? new Date() } });
    else await this.db.article.update({ where: { id }, data: { status: 'DRAFT', reviewNote: new Input(body).optionalText('note', 'Note', 400) } });
    return { ok: true as const, slug: a.slug, kind: a.kind };
  }
  async remove(user: Who, id: string) {
    const a = await this.row(user, id);
    if (a.status === 'PUBLISHED' && !isStaff(user)) throw new ForbiddenException('This piece is published. Ask an editor to take it down first.');
    await this.db.article.delete({ where: { id } });
    return { ok: true as const };
  }
  /** For the writer's home screen. */
  async counts(user: Who) {
    const rows = await this.db.article.groupBy({ by: ['status'], where: isStaff(user) ? {} : { authorId: user.id }, _count: true });
    const n = (s: string) => rows.find((r) => r.status === s)?._count ?? 0;
    return { draft: n('DRAFT'), submitted: n('SUBMITTED'), published: n('PUBLISHED') };
  }
}

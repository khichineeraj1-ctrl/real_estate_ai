import { NextResponse } from 'next/server';
import { buyerFetch } from '@/lib/buyer';

const SLUG = /^[a-z0-9-]{1,200}$/;
type Body = { kind?: unknown; slug?: unknown; note?: unknown };
const read = async (req: Request) => ((await req.json().catch(() => null)) ?? {}) as Body;

/** Save a project or home, or change its note. */
export async function POST(req: Request) {
  const b = await read(req);
  const r = await buyerFetch('/saved', { method: 'POST', body: { kind: b.kind, slug: b.slug, note: b.note } });
  return NextResponse.json(r.ok ? { ok: true } : { error: r.error }, { status: r.ok ? 200 : r.status });
}
export async function DELETE(req: Request) {
  const b = await read(req);
  if ((b.kind !== 'project' && b.kind !== 'property') || typeof b.slug !== 'string' || !SLUG.test(b.slug)) return NextResponse.json({ error: 'Nothing to remove' }, { status: 400 });
  const r = await buyerFetch(`/saved/${b.kind}/${b.slug}`, { method: 'DELETE' });
  return NextResponse.json(r.ok ? { ok: true } : { error: r.error }, { status: r.ok ? 200 : r.status });
}

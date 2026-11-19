import { NextResponse } from 'next/server';
import { buyerFetch } from '@/lib/buyer';

/** Keeps the buyer's shortlists and checklist ticks on their account. The API cleans what it is sent. */
export async function PUT(req: Request) {
  const b = (await req.json().catch(() => null)) as { state?: unknown } | null;
  const r = await buyerFetch('/state', { method: 'PUT', body: { state: b?.state } });
  return NextResponse.json(r.ok ? { ok: true } : { error: r.error }, { status: r.ok ? 200 : r.status });
}

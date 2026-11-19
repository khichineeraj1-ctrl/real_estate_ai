import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

/** Project search for the compare picker. The browser asks here and this server asks the API. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = new URLSearchParams({ text: (u.searchParams.get('q') ?? '').slice(0, 80) });
  const city = u.searchParams.get('city');
  if (city && /^[a-z0-9-]{1,40}$/.test(city)) q.set('city', city);
  const found = await api<{ total: number; items: unknown[] }>(`/projects?${q}`, { revalidate: 60 }).catch(() => null);
  return NextResponse.json(found ?? { total: 0, items: [] });
}

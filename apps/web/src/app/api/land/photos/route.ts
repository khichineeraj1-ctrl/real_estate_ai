import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4100';
const MAX_BYTES = 6 * 1024 * 1024; // one photo per request, already made smaller in the browser

/** Passes a poster's photo on to the API. The private key inside the form is the permission; nothing is stored here. */
export async function POST(req: Request) {
  const type = req.headers.get('content-type') ?? '';
  if (!type.startsWith('multipart/form-data')) return NextResponse.json({ message: 'Send a photo' }, { status: 400 });
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES) return NextResponse.json({ message: 'That photo is too large. Each photo must be under 5 MB.' }, { status: 413 });
  const body = await req.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return NextResponse.json({ message: 'That photo is too large. Each photo must be under 5 MB.' }, { status: 413 });
  try {
    const res = await fetch(`${API_URL}/land/photos`, { method: 'POST', headers: { 'content-type': type }, body, cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    if (!res.ok) { const m = data?.message; return NextResponse.json({ message: (Array.isArray(m) ? m[0] : m) || 'That photo could not be added.' }, { status: res.status === 413 ? 413 : 400 }); }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'That did not work. Please try again.' }, { status: 502 });
  }
}

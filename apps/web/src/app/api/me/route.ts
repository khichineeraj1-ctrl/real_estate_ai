import { NextResponse } from 'next/server';
import { getBuyer } from '@/lib/buyer';

/** What the page needs to know about the visitor: whether they are signed in, what they saved, and their synced state. */
export async function GET() {
  const me = await getBuyer();
  return NextResponse.json(me ? { signedIn: true, email: me.email, saved: me.saved.map((s) => ({ kind: s.kind, slug: s.slug, note: s.note })), state: me.state } : { signedIn: false }, { headers: { 'cache-control': 'no-store' } });
}

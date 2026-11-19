import { NextResponse } from 'next/server';
import { buyerFetch, startBuyerSession } from '@/lib/buyer';

/** The link in the sign-in email: checks the code, starts the session and goes to the account page. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const r = await buyerFetch<{ token: string }>('/verify', { method: 'POST', open: true, body: { email: u.searchParams.get('email'), code: u.searchParams.get('code'), visitor: req.headers.get('x-forwarded-for')?.split(',')[0].trim() } });
  if (r.ok) await startBuyerSession(r.data.token);
  return NextResponse.redirect(new URL(r.ok ? '/account' : '/account?expired=1', process.env.SITE_URL || u.origin));
}

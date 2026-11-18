import { API_URL, sessionToken } from '@/lib/admin';

const go = (location: string) => new Response(null, { status: 303, headers: { location } });

/** The link in the "confirm your email" message lands here. The API checks the one-time secret. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const res = await fetch(`${API_URL}/admin/verify-email`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' }).catch(() => null);
  const signedIn = !!(await sessionToken());
  if (res?.ok) return go(signedIn ? '/admin?verified=1' : '/admin/login?verify=ok');
  return go(signedIn ? '/admin' : '/admin/login?verify=failed');
}

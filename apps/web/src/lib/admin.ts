import 'server-only';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const API_URL = process.env.API_URL || 'http://localhost:4100';
export const ADMIN_COOKIE = 'admin_session';

export type Role = 'ADMIN' | 'EDITOR' | 'AGENT' | 'BUILDER' | 'WRITER';
export interface Me { id: string; email: string; name: string; phone: string | null; role: Role; active: boolean; emailVerified: string | null }
export const isStaff = (role: Role) => role === 'ADMIN' || role === 'EDITOR';

export type AdminResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export const sessionToken = async () => (await cookies()).get(ADMIN_COOKIE)?.value;

/** Calls the API's admin endpoints with the signed-in session. The API checks the session and the role on every call; this site only carries the session. */
export async function adminFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<AdminResult<T>> {
  const token = await sessionToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin${path}`, {
      method: init?.method ?? 'GET', cache: 'no-store',
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    return { ok: false, status: 503, error: 'The API is not reachable. Check that it is running.' };
  }
  const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!res.ok) return { ok: false, status: res.status, error: (Array.isArray(data?.message) ? data.message.join('. ') : data?.message) || `The API answered ${res.status}` };
  return { ok: true, data: data as T };
}

/** For pages: returns the data, sends signed-out visitors to sign in, and sends people without the right role back to their home screen. */
export async function adminGet<T>(path: string): Promise<T> {
  const r = await adminFetch<T>(path);
  if (r.ok) return r.data;
  if (r.status === 401) redirect('/admin/login');
  if (r.status === 403) redirect('/admin');
  if (r.status === 404) notFound();
  throw new Error(r.error);
}

export const getMe = () => adminGet<Me>('/me');

/** For staff-only screens that load nothing role-restricted themselves (blank "add" forms): owners and agents go back to their home screen. */
export async function requireStaff(): Promise<Me> {
  const me = await getMe();
  if (!isStaff(me.role)) redirect('/admin');
  return me;
}

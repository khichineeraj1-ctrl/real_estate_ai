import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:4100';
export const BUYER_COOKIE = 'buyer_session';
const SIXTY_DAYS = 60 * 24 * 3600;

export interface SavedItem { kind: 'project' | 'property'; slug: string; name: string; sub: string; city?: string; brand?: string | null; priceInr?: number; photo: { file: string } | null; registerStatus?: string | null; registerValidUntil?: string | null; note: string | null; savedAt: string }
export interface SentEnquiry { at: string; wantsVisit: boolean; about: { kind: 'project' | 'property'; slug: string; name: string } | null; agent: { name: string; phone: string | null } | null }
export interface SyncState { ticks: Record<string, string[]>; compare: { homes: { slug: string; title: string }[]; projects: { slug: string; title: string }[] } }
export interface BuyerAccount { email: string; since: string; state: SyncState; saved: SavedItem[]; enquiries: SentEnquiry[]; alerts: { id: string; label: string; path: string }[]; follows: { id: string; slug: string; name: string }[] }

export const buyerToken = async () => (await cookies()).get(BUYER_COOKIE)?.value;
export async function startBuyerSession(token: string) {
  (await cookies()).set(BUYER_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SIXTY_DAYS });
}
export async function endBuyerSession() { (await cookies()).delete(BUYER_COOKIE); }

/** Calls the API's /me routes with the buyer's session. The API checks the session on every call; this site only carries it. */
export async function buyerFetch<T>(path: string, init?: { method?: string; body?: unknown; open?: boolean }): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const token = init?.open ? undefined : await buyerToken();
  if (!token && !init?.open) return { ok: false, status: 401, error: 'Sign in to continue' };
  try {
    const res = await fetch(`${API_URL}/me${path}`, {
      method: init?.method ?? 'GET', cache: 'no-store',
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return res.ok ? { ok: true, data: data as T } : { ok: false, status: res.status, error: data?.message || 'That did not work. Please try again.' };
  } catch {
    return { ok: false, status: 503, error: 'We could not reach the server. Please try again.' };
  }
}
/** The signed-in buyer's account, or null. */
export async function getBuyer(): Promise<BuyerAccount | null> {
  const r = await buyerFetch<BuyerAccount>('');
  return r.ok ? r.data : null;
}

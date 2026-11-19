'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:4100';
export interface LandState { error?: string; done?: boolean }

async function send(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> | null }> {
  const visitor = (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
  try {
    const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, visitor }), cache: 'no-store' });
    return { ok: res.ok, data: (await res.json().catch(() => null)) as Record<string, unknown> | null };
  } catch { return { ok: false, data: null }; }
}
const fields = (form: FormData) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string' && !k.startsWith('$')) out[k] = k === 'features' ? [...(Array.isArray(out.features) ? (out.features as string[]) : []), v] : v;
  return out;
};
const message = (data: Record<string, unknown> | null) => { const m = data?.message; return (Array.isArray(m) ? m[0] : m) as string | undefined || 'That did not work. Please try again.'; };

async function post(path: string, form: FormData): Promise<LandState> {
  const r = await send(path, fields(form));
  if (!r.ok) return { error: message(r.data) };
  // A filled honeypot is answered as if it worked, with nothing made.
  if (!r.data?.token) return { done: true };
  redirect(`/land/manage?token=${encodeURIComponent(String(r.data.token))}&new=1`);
}
export async function postLand(_: LandState, form: FormData): Promise<LandState> { return post('/land', form); }
export async function postWanted(_: LandState, form: FormData): Promise<LandState> { return post('/land/wanted', form); }

/** An enquiry on a listing, or an owner's answer to a requirement. */
export async function replyLand(type: 'listing' | 'wanted', slug: string, _: LandState, form: FormData): Promise<LandState> {
  const r = await send(type === 'listing' ? `/land/listing/${encodeURIComponent(slug)}/enquire` : `/land/wanted/${encodeURIComponent(slug)}/answer`, fields(form));
  return r.ok ? { done: true } : { error: message(r.data) };
}
export async function closeLand(token: string, _: LandState): Promise<LandState> {
  const r = await send('/land/manage', { token, close: true });
  if (!r.ok) return { error: message(r.data) };
  revalidatePath('/land', 'layout');
  return { done: true };
}

'use server';

import { headers } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:4100';
export interface InterestState { error?: string; done?: boolean }

/** "I am interested", for one area or in general. It reaches our team, who call back. */
export async function showInterest(slug: string | null, _: InterestState, form: FormData): Promise<InterestState> {
  if (form.get('website')) return { done: true };
  const visitor = (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
  const body: Record<string, unknown> = { visitor };
  for (const [k, v] of form.entries()) if (typeof v === 'string' && !k.startsWith('$')) body[k] = v;
  try {
    const res = await fetch(`${API_URL}/invest/${slug ? `${encodeURIComponent(slug)}/interest` : 'interest'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    if (res.ok) return { done: true };
    const m = ((await res.json().catch(() => null)) as { message?: string | string[] } | null)?.message;
    return { error: (Array.isArray(m) ? m[0] : m) || 'That did not work. Please try again.' };
  } catch { return { error: 'That did not work. Please try again.' }; }
}

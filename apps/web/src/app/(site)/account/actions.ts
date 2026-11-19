'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { buyerFetch, endBuyerSession, startBuyerSession } from '@/lib/buyer';

export interface SignInState { step?: 'code'; email?: string; error?: string }
const visitor = async () => (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
/** Only paths on this site, so a sign-in link cannot send someone elsewhere. */
const safeNext = (v: FormDataEntryValue | null) => (typeof v === 'string' && /^\/[a-z0-9/_?=&,.%-]*$/i.test(v) && !v.startsWith('//') ? v : '/account');

/** Step one: email a code. Step two: check it and sign in. */
export async function signIn(_: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim();
  const code = String(form.get('code') ?? '').trim();
  if (!code) {
    const r = await buyerFetch('/code', { method: 'POST', open: true, body: { email, visitor: await visitor() } });
    return r.ok ? { step: 'code', email } : { error: r.error };
  }
  const r = await buyerFetch<{ token: string }>('/verify', { method: 'POST', open: true, body: { email, code, visitor: await visitor() } });
  if (!r.ok) return { step: 'code', email, error: r.error };
  await startBuyerSession(r.data.token);
  redirect(safeNext(form.get('next')));
}

export async function signOut() {
  await buyerFetch('/signout', { method: 'POST' });
  await endBuyerSession();
  redirect('/account');
}

export async function deleteAccount() {
  await buyerFetch('', { method: 'DELETE' });
  await endBuyerSession();
  redirect('/account?deleted=1');
}

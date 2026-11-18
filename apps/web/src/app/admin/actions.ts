'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, adminFetch } from '@/lib/admin';

export interface FormState { error?: string; ok?: string; rows?: { row: number; error: string }[] }
const ENTITIES = ['properties', 'projects', 'localities', 'cities', 'users'] as const;
export type Entity = (typeof ENTITIES)[number];

const fields = (form: FormData) => Object.fromEntries([...form.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string'));

async function startSession(token: string) {
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600 });
}
/** Every action goes through the API, which decides what this account may do; a lapsed session goes back to sign-in. */
function failed(r: { status: number; error: string }): FormState {
  if (r.status === 401) redirect('/admin/login');
  return { error: r.error };
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch<{ token: string }>('/login', { method: 'POST', body: { email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') } });
  if (!r.ok) return { error: r.error };
  await startSession(r.data.token);
  redirect('/admin');
}

/** Sign-up for owners, agents and builders. They are signed in, and asked to confirm their email before posting. */
export async function register(_: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch<{ token: string }>('/register', { method: 'POST', body: fields(form) });
  if (!r.ok) return { error: r.error };
  await startSession(r.data.token);
  redirect('/admin?welcome=1');
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

/** Creates (no id) or updates a record, then refreshes every public page so the change is visible straight away. */
export async function save(entity: Entity, id: string | null, _: FormState, form: FormData): Promise<FormState> {
  if (!ENTITIES.includes(entity)) return { error: 'Unknown record type' };
  const r = await adminFetch<{ id: string }>(id ? `/${entity}/${encodeURIComponent(id)}` : `/${entity}`, { method: id ? 'PATCH' : 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  // A new listing opens on its own page, where photos are added.
  redirect(entity === 'properties' && !id ? `/admin/properties/${r.data.id}?created=1` : `/admin/${entity}?saved=1`);
}

export async function remove(entity: Entity, id: string, _: FormState): Promise<FormState> {
  if (!ENTITIES.includes(entity) || entity === 'users') return { error: 'Unknown record type' };
  const r = await adminFetch(`/${entity}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/${entity}?deleted=1`);
}

export async function review(id: string, decision: 'approve' | 'reject', _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/properties/${encodeURIComponent(id)}/review`, { method: 'POST', body: { decision, reason: String(form.get('reason') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/properties?state=PENDING&reviewed=${decision}`);
}

export async function removePhoto(photoId: string, propertyId: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/properties/${propertyId}?photoDeleted=1`);
}

/** Records where the follow-up on a lead stands. The API checks that this account is allowed to see that lead. */
export async function updateEnquiry(id: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/enquiries/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: String(form.get('status') ?? ''), note: String(form.get('note') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/admin', 'layout'); // counts on the tabs and the overview
  return { ok: 'Saved' };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  if (form.get('password') !== form.get('again')) return { error: 'The two new passwords do not match' };
  const r = await adminFetch<{ token: string }>('/me/password', { method: 'POST', body: { current: String(form.get('current') ?? ''), password: String(form.get('password') ?? '') } });
  if (!r.ok) return failed(r);
  await startSession(r.data.token); // the old session ended with the old password
  return { ok: 'Password changed. Any other device signed in to this account has been signed out.' };
}

export async function resendVerification(_: FormState): Promise<FormState> {
  const r = await adminFetch('/me/resend-verification', { method: 'POST' });
  return r.ok ? { ok: 'Sent. Open the link in the email to confirm your address.' } : failed(r);
}

/** Says the same thing whether or not the email has an account, so it cannot be used to look accounts up. */
export async function forgotPassword(_: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch('/forgot', { method: 'POST', body: { email: String(form.get('email') ?? '') } });
  return r.ok ? { ok: 'If that email has an account, we have sent a link to choose a new password. It works for 1 hour.' } : { error: r.error };
}

export async function resetPassword(token: string, _: FormState, form: FormData): Promise<FormState> {
  if (form.get('password') !== form.get('again')) return { error: 'The two passwords do not match' };
  const r = await adminFetch('/reset', { method: 'POST', body: { token, password: String(form.get('password') ?? '') } });
  if (!r.ok) return { error: r.error };
  redirect('/admin/login?reset=1');
}

export async function importCsv(_: FormState, form: FormData): Promise<FormState> {
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a CSV file' };
  if (file.size > 1_500_000) return { error: 'The file is too large. Split it into files of up to 500 listings.' };
  const r = await adminFetch<{ imported: number; errors: { row: number; error: string }[] }>('/import/properties', { method: 'POST', body: { csv: await file.text() } });
  if (!r.ok) return failed(r);
  if (r.data.errors.length) return { error: `Nothing was imported: ${r.data.errors.length} ${r.data.errors.length === 1 ? 'row needs' : 'rows need'} fixing. Correct the file and upload it again.`, rows: r.data.errors };
  revalidatePath('/', 'layout');
  return { ok: `Imported ${r.data.imported} ${r.data.imported === 1 ? 'listing' : 'listings'}. They are live on the site.` };
}

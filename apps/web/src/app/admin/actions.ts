'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, adminFetch } from '@/lib/admin';

export interface FormState { error?: string }
const ENTITIES = ['properties', 'projects', 'localities', 'cities'] as const;
export type Entity = (typeof ENTITIES)[number];

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch<{ token: string }>('/login', { method: 'POST', body: { email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') } });
  if (!r.ok) return { error: r.error };
  (await cookies()).set(ADMIN_COOKIE, r.data.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600 });
  redirect('/admin');
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

/** Creates (no id) or updates a record, then refreshes every public page so the change is visible straight away. */
export async function save(entity: Entity, id: string | null, _: FormState, form: FormData): Promise<FormState> {
  if (!ENTITIES.includes(entity)) return { error: 'Unknown record type' };
  const body = Object.fromEntries([...form.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string'));
  const r = await adminFetch(id ? `/${entity}/${encodeURIComponent(id)}` : `/${entity}`, { method: id ? 'PATCH' : 'POST', body });
  if (!r.ok) {
    if (r.status === 401) redirect('/admin/login');
    return { error: r.error };
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/${entity}?saved=1`);
}

export async function remove(entity: Entity, id: string, _: FormState): Promise<FormState> {
  if (!ENTITIES.includes(entity)) return { error: 'Unknown record type' };
  const r = await adminFetch(`/${entity}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) {
    if (r.status === 401) redirect('/admin/login');
    return { error: r.error };
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/${entity}?deleted=1`);
}

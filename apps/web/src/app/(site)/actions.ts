'use server';

import { headers } from 'next/headers';

export interface EnquiryState { error?: string; sent?: true; seller?: { name: string; phone: string; level?: number | null; label?: string } | null }

const API_URL = process.env.API_URL || 'http://localhost:4100';

/**
 * A buyer asks to be contacted. For a listing the API tells the seller and returns the seller's contact; for a builder
 * project it keeps the lead for our team (and the builder's sales address) and returns no contact.
 */
export async function enquire(kind: 'property' | 'project', slug: string, _: EnquiryState, form: FormData): Promise<EnquiryState> {
  // A field people never see or fill; scripts that fill every field give themselves away.
  if (form.get('website')) return { sent: true, seller: null };
  if (!form.get('consent')) return { error: 'Tick the box to agree to be contacted' };
  const visitor = (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
  const body = { name: form.get('name'), phone: form.get('phone'), email: form.get('email'), message: form.get('message'), interest: form.get('interest'), visitor };
  try {
    const res = await fetch(`${API_URL}/${kind === 'project' ? 'projects' : 'properties'}/${encodeURIComponent(slug)}/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as { message?: string; seller?: { name: string; phone: string; level?: number | null; label?: string } | null } | null;
    if (!res.ok) return { error: data?.message || 'Your enquiry could not be sent. Please try again.' };
    return { sent: true, seller: data?.seller ?? null };
  } catch {
    return { error: 'Your enquiry could not be sent. Please try again.' };
  }
}

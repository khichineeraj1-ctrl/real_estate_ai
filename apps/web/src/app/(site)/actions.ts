'use server';

import { headers } from 'next/headers';

export interface EnquiryState { error?: string; sent?: true; seller?: { name: string; phone: string } | null }

const API_URL = process.env.API_URL || 'http://localhost:4100';

/** A buyer asks to be contacted about a listing. The API saves it, tells the seller, and returns the seller's contact. */
export async function enquire(slug: string, _: EnquiryState, form: FormData): Promise<EnquiryState> {
  // A field people never see or fill; scripts that fill every field give themselves away.
  if (form.get('website')) return { sent: true, seller: null };
  if (!form.get('consent')) return { error: 'Tick the box to share your details with the seller' };
  const visitor = (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
  const body = { name: form.get('name'), phone: form.get('phone'), email: form.get('email'), message: form.get('message'), visitor };
  try {
    const res = await fetch(`${API_URL}/properties/${encodeURIComponent(slug)}/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as { message?: string; seller?: { name: string; phone: string } | null } | null;
    if (!res.ok) return { error: data?.message || 'Your enquiry could not be sent. Please try again.' };
    return { sent: true, seller: data?.seller ?? null };
  } catch {
    return { error: 'Your enquiry could not be sent. Please try again.' };
  }
}

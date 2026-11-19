'use server';

import { headers } from 'next/headers';

export interface EnquiryState {
  error?: string; sent?: true; seller?: { name: string; phone: string; level?: number | null; label?: string } | null;
  /** The verified agent the buyer was connected to, when they asked for one and the project has one. */
  agent?: { name: string; phone: string; firmName: string | null; level: number; label: string } | null;
}

const API_URL = process.env.API_URL || 'http://localhost:4100';

export interface ReportState { error?: string; sent?: true; token?: string; emailed?: boolean }

/** A buyer reports a listing or its seller. Staff look into it; nothing changes for the seller unless they uphold it. */
export async function reportListing(slug: string, _: ReportState, form: FormData): Promise<ReportState> {
  if (form.get('website')) return { sent: true }; // the hidden field only scripts fill in
  const email = String(form.get('email') ?? '').trim();
  const visitor = (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
  const body = { reason: form.get('reason'), details: form.get('details'), name: form.get('name'), phone: form.get('phone'), email, visitor };
  try {
    const res = await fetch(`${API_URL}/properties/${encodeURIComponent(slug)}/reports`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as { message?: string; token?: string } | null;
    return res.ok ? { sent: true, token: data?.token, emailed: !!email } : { error: data?.message || 'Your report could not be sent. Please try again.' };
  } catch {
    return { error: 'Your report could not be sent. Please try again.' };
  }
}

/**
 * A buyer asks to be contacted. For a listing the API tells the seller and returns the seller's contact; for a builder
 * project it keeps the lead for our team (and the builder's sales address) and returns no contact.
 */
export async function enquire(kind: 'property' | 'project', slug: string, via: 'agent' | null, _: EnquiryState, form: FormData): Promise<EnquiryState> {
  // A field people never see or fill; scripts that fill every field give themselves away.
  if (form.get('website')) return { sent: true, seller: null };
  if (!form.get('consent')) return { error: 'Tick the box to agree to be contacted' };
  const visitor = (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
  const body = { name: form.get('name'), phone: form.get('phone'), email: form.get('email'), message: form.get('message'), interest: form.get('interest'), visitor, via,
    // The buyer's plans, each optional, and their browser's note of how they used the site: the API scores the lead from these.
    timeline: form.get('timeline'), budget: form.get('budget'), loan: form.get('loan'), purpose: form.get('purpose'), wantsVisit: form.get('wantsVisit') === 'on', signals: form.get('signals') };
  try {
    const res = await fetch(`${API_URL}/${kind === 'project' ? 'projects' : 'properties'}/${encodeURIComponent(slug)}/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as { message?: string; seller?: EnquiryState['seller']; agent?: EnquiryState['agent'] } | null;
    if (!res.ok) return { error: data?.message || 'Your enquiry could not be sent. Please try again.' };
    return { sent: true, seller: data?.seller ?? null, agent: data?.agent ?? null };
  } catch {
    return { error: 'Your enquiry could not be sent. Please try again.' };
  }
}

export interface FollowState { done?: boolean; error?: string }
/** Follow a project: the buyer is emailed when its RERA registration changes. */
export async function followProject(slug: string, _: FollowState, form: FormData): Promise<FollowState> {
  if (form.get('website')) return { done: true };
  if (!form.get('consent')) return { error: 'Tick the box to agree to be emailed' };
  const visitor = (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
  try {
    const res = await fetch(`${API_URL}/projects/${encodeURIComponent(slug)}/follow`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), consent: true, visitor }), cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return res.ok ? { done: true } : { error: data?.message || 'That did not work. Please try again.' };
  } catch {
    return { error: 'That did not work. Please try again.' };
  }
}
/** The link at the foot of every alert email. */
export async function unfollow(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/unfollow`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' });
    return res.ok;
  } catch { return false; }
}

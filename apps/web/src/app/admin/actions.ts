'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, adminFetch } from '@/lib/admin';

export interface FormState { error?: string; ok?: string; rows?: { row: number; error: string }[] }
const ENTITIES = ['properties', 'projects', 'localities', 'cities', 'users'] as const;
export type Entity = (typeof ENTITIES)[number];

/** A form's text fields. A name that appears several times (tick boxes sharing one name) is sent as one comma-separated list. */
const fields = (form: FormData) => {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (!k.startsWith('$') && typeof v === 'string') out[k] = k in out ? [out[k], v].filter(Boolean).join(',') : v;
  return out;
};

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

// ---- RERA registers

/** Starts reading one state's public register in the background. */
export async function readRegister(source: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch('/register/read', { method: 'POST', body: { source, maxPages: Number(form.get('maxPages') ?? 5) } });
  if (!r.ok) return failed(r);
  redirect('/admin/register?started=1');
}

/** Reads a batch of Haryana project application forms in the background. */
export async function readProjectForms(_: FormState, __: FormData): Promise<FormState> {
  const r = await adminFetch('/register/forms', { method: 'POST', body: { limit: 25 } });
  if (!r.ok) return failed(r);
  redirect('/admin/register?started=1');
}

/** Places a register entry in one of our localities, which makes its project page. */
export async function publishRegisterEntry(id: string, backTo: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/register/entries/${encodeURIComponent(id)}/publish`, { method: 'POST', body: { localityId: String(form.get('localityId') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(backTo.startsWith('/admin/register') ? backTo : '/admin/register');
}

export async function unpublishRegisterEntry(id: string, backTo: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/register/entries/${encodeURIComponent(id)}/unpublish`, { method: 'POST' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(backTo.startsWith('/admin/register') ? backTo : '/admin/register');
}

// ---- Seller verification

export async function saveDealerProfile(_: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch('/dealer/profile', { method: 'PUT', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout'); // a verified seller who edits their details loses the label until re-checked
  redirect('/admin/verification?saved=1');
}

export async function submitDealerProfile(_: FormState): Promise<FormState> {
  const r = await adminFetch('/dealer/profile/submit', { method: 'POST' });
  if (!r.ok) return failed(r);
  redirect('/admin/verification');
}

export async function removeDocument(id: string, backTo: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  redirect(backTo.startsWith('/admin/') ? backTo : '/admin');
}

/** Staff record what they checked about a seller and decide; the button pressed carries the decision. */
export async function reviewDealer(userId: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/dealers/${encodeURIComponent(userId)}/review`, { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout'); // their listings move up or down for buyers straight away
  redirect(`/admin/dealers/${userId}?done=1`);
}

export async function purgeDocuments(userId: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/dealers/${encodeURIComponent(userId)}/documents/purge`, { method: 'POST' });
  if (!r.ok) return failed(r);
  redirect(`/admin/dealers/${userId}?purged=1`);
}

/** Staff decide a buyer's report after looking into it; the button pressed carries the decision. */
export async function decideReport(id: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/reports/${encodeURIComponent(id)}/decide`, { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout'); // the seller's level, and so the order buyers see, may have changed
  redirect('/admin/reports?decided=1');
}

/** Staff confirm they checked a home's papers or visited it, or withdraw that. */
export async function verifyProperty(id: string, verified: boolean, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/properties/${encodeURIComponent(id)}/verify`, { method: 'POST', body: { verified: String(verified), note: String(form.get('note') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/properties/${id}?verified=${verified ? '1' : '0'}`);
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

/** Changes the name shown on a builder's public page. */
export async function renameBuilderPage(id: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/builder-pages/${encodeURIComponent(id)}`, { method: 'PATCH', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/builder-pages?saved=1');
}

/** Moves one builder page's projects onto another and removes the emptied page. Old project addresses redirect. */
export async function mergeBuilderPage(id: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/builder-pages/${encodeURIComponent(id)}/merge`, { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/builder-pages?merged=1');
}

/** A verified agent asks to be offered to buyers for a project. */
export async function requestSelling(_: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch('/selling', { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  redirect('/admin/selling?asked=1');
}

/** An agent withdraws from a project they sell (or a request they made). */
export async function stopSelling(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/selling/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout'); // the project's "verified agent" button may change
  redirect('/admin/selling?removed=1');
}

/** Staff approve or turn down an agent's request to sell a project. */
export async function decideProjectSeller(id: string, decision: 'APPROVED' | 'REJECTED', _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/project-sellers/${encodeURIComponent(id)}/decide`, { method: 'POST', body: { decision, note: String(form.get('note') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/project-sellers?decided=1');
}

/** Deletes one photo of a builder's project. */
export async function removeProjectPhoto(photoId: string, projectId: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/projects/${projectId}?photoDeleted=1#photos`);
}

/** Says what a photo shows, which decides its group in the gallery. */
export async function groupPhoto(photoId: string, category: string): Promise<{ error?: string }> {
  const r = await adminFetch(`/photos/${encodeURIComponent(photoId)}`, { method: 'PATCH', body: { category } });
  if (!r.ok) return { error: r.status === 401 ? 'Please sign in again' : r.error };
  revalidatePath('/', 'layout');
  return {};
}

/** Adds a YouTube video to a listing or a project. */
export async function addVideo(kind: 'properties' | 'projects', id: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/${kind}/${encodeURIComponent(id)}/videos`, { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/${kind}/${id}?videoAdded=1#videos`);
}

export async function removeVideo(kind: 'properties' | 'projects', id: string, videoId: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/${kind}/${id}?videoRemoved=1#videos`);
}

/** An agent sends in a YouTube video they filmed of a project they are approved to sell. Staff look at it before it shows. */
export async function addSiteVideo(sellingId: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/selling/${encodeURIComponent(sellingId)}/videos`, { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  redirect('/admin/selling?videoSent=1');
}
export async function removeMySiteVideo(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/selling-videos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/selling?videoRemoved=1');
}
/** Staff approve a video an agent sent in, or remove it. */
export async function approveSiteVideo(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/site-videos/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/site-videos?done=1');
}
export async function rejectSiteVideo(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/videos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/site-videos?done=1');
}

/** A verified agent or a builder tells us about a project that is coming but not registered yet. */
export async function submitUpcoming(_: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch('/upcoming', { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/upcoming?sent=1');
}
export async function withdrawUpcoming(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/upcoming/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/upcoming?removed=1');
}
/** Staff approve or turn down an upcoming project, or mark it registered and link it to its real page. */
export async function decideUpcoming(id: string, decision: 'APPROVED' | 'REJECTED', _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/upcoming/${encodeURIComponent(id)}/decide`, { method: 'POST', body: { decision, note: String(form.get('note') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/upcoming?saved=1');
}
export async function upcomingRegistered(id: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch<{ told: number }>(`/upcoming/${encodeURIComponent(id)}/registered`, { method: 'POST', body: { projectSlug: String(form.get('projectSlug') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/upcoming?status=APPROVED&told=${r.data.told}`);
}

/** A writer saves a new piece as a draft, or saves changes to one. */
export async function saveArticle(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const r = id ? await adminFetch(`/articles/${encodeURIComponent(id)}`, { method: 'PUT', body: fields(form) }) : await adminFetch<{ id: string }>('/articles', { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  if (!id) redirect(`/admin/articles/${(r.data as { id: string }).id}?saved=1`);
  revalidatePath('/', 'layout');
  return { ok: 'Saved.' };
}
export async function submitArticle(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/articles/${encodeURIComponent(id)}/submit`, { method: 'POST' });
  if (!r.ok) return failed(r);
  redirect(`/admin/articles/${id}?sent=1`);
}
/** An editor publishes a piece, sends it back with a note, or takes a published one down. */
export async function decideArticle(id: string, decision: 'PUBLISH' | 'SEND_BACK' | 'TAKE_DOWN', _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/articles/${encodeURIComponent(id)}/decide`, { method: 'POST', body: { decision, note: String(form.get('note') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/articles/${id}?decided=${decision}`);
}
export async function removeArticle(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/articles/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect('/admin/articles?removed=1');
}

/** Staff approve or turn down a land listing or a requirement; on a listing they may correct the district's spelling. */
export async function decideLand(type: 'listing' | 'wanted', id: string, decision: 'LIVE' | 'REJECTED', _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/land/${type}/${encodeURIComponent(id)}/decide`, { method: 'POST', body: { decision, note: String(form.get('note') ?? ''), district: String(form.get('district') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/land', 'layout'); revalidatePath('/', 'layout');
  redirect('/admin/land?saved=1');
}
export async function landReplyDone(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/land/replies/${encodeURIComponent(id)}/done`, { method: 'POST' });
  if (!r.ok) return failed(r);
  redirect('/admin/land?tab=replies&saved=1');
}

/** Investor corner: staff write an area from the official documents, then publish it or take it down. */
export async function saveInvest(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const r = id ? await adminFetch(`/invest/${encodeURIComponent(id)}`, { method: 'PUT', body: fields(form) }) : await adminFetch<{ id: string }>('/invest', { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  if (!id) redirect(`/admin/invest/${(r.data as { id: string }).id}?saved=1`);
  return { ok: 'Saved.' };
}
export async function publishInvest(id: string, to: 'LIVE' | 'DRAFT' | 'REVIEWED', _: FormState): Promise<FormState> {
  const r = await adminFetch(`/invest/${encodeURIComponent(id)}/publish`, { method: 'POST', body: { to } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/invest/${id}?done=${to}`);
}
export async function removeInvest(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/invest/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  redirect('/admin/invest?removed=1');
}
export async function investDone(id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/invest/interests/${encodeURIComponent(id)}/done`, { method: 'POST' });
  if (!r.ok) return failed(r);
  redirect('/admin/invest?tab=interests&saved=1');
}

/** A project's kinds of home (2 BHK, 3 BHK…), and the places distances are measured to in each city. */
export async function addUnit(projectId: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch(`/projects/${encodeURIComponent(projectId)}/units`, { method: 'POST', body: fields(form) });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/projects/${projectId}?unit=added#units`);
}
export async function removeUnit(projectId: string, unitId: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/projects/${encodeURIComponent(projectId)}/units/${encodeURIComponent(unitId)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/projects/${projectId}?unit=removed#units`);
}
export async function addLandmarks(city: string, _: FormState, form: FormData): Promise<FormState> {
  const r = await adminFetch<{ added: number }>(`/landmarks/${encodeURIComponent(city)}`, { method: 'POST', body: { lines: String(form.get('lines') ?? '') } });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/landmarks?city=${city}&added=${r.data.added}`);
}
export async function removeLandmark(city: string, id: string, _: FormState): Promise<FormState> {
  const r = await adminFetch(`/landmarks/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return failed(r);
  revalidatePath('/', 'layout');
  redirect(`/admin/landmarks?city=${city}&removed=1`);
}

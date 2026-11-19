import { Platform } from 'react-native';
import { authHeader, endSession, sessionReady } from './session';
import { API_URL } from './config';
import type { CityCosts } from './finance';

export type PropertyType = 'APARTMENT' | 'VILLA' | 'BUILDER_FLOOR' | 'PLOT';
export type Status = 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION';
export interface Place { slug: string; name: string }
export interface Stats { count: number; minPrice: number | null; maxPrice: number | null; avgRate: number | null }
export interface PropertyCard {
  /** Who posted it: OWNER, AGENT or BUILDER. */
  listedBy?: string;
  slug: string; title: string; type: PropertyType; bhk: number; bathrooms: number; priceInr: number; areaSqft: number; status: Status; possession: string | null;
  locality: Place & { city: Place }; project: (Place & { builder: string }) | null;
  /** The cover only on cards; every photo on the detail screen. */
  photos: { file: string }[];
  /** How far the home and its seller are verified, 0 (not yet) to 3 (high). */
  confidence?: number;
}
export interface Confidence { level: number; label: string; reasons: { ok: boolean; text: string }[] }
export const CONFIDENCE_LABELS = ['Not yet verified', 'Basic checks only', 'Good confidence', 'High confidence'];
export interface CitySummary extends Place { state: string; localities: Place[]; stats: Stats; costs: CityCosts | null }
export interface LocalityDetail extends Place {
  intro: string; highlights: string[]; city: Place & { state: string }; stats: Stats;
  bhk: { bhk: number; count: number; minPrice: number | null }[]; nearby: Place[];
  projects: (Place & { builder: string; brand: Place | null; registerSource: string | null; agents?: number; photos?: { file: string; width?: number; height?: number }[] })[];
}
/** A builder as buyers know it, across the companies its projects are registered under. */
export interface BuilderSummary extends Place { projects: number; cities: Place[] }
export interface BuilderRecord { total: number; current: number; ended: number; lapsed: number; unknown: number; since: number | null; latest: number | null; nextDue: { name: string; date: string } | null; lapsedNames: string[]; verdict: { tone: Tone; title: string; text: string } }
export interface CheckItem { key: string; tone: Tone; title: string; why: string; link?: { href: string; label: string } }
export interface BuilderDetail extends Place {
  record: BuilderRecord;
  registeredAs: string[]; cities: Place[];
  projects: (Place & { builder: string; reraId: string | null; registerSource: string | null; registerStatus: string | null; registerValidUntil: string | null; homes: number; agents?: number; photos?: { file: string; width?: number; height?: number }[]; locality: Place; city: Place })[];
}
export interface ProjectDetail extends Place {
  checklist: CheckItem[];
  declared?: { litigation: boolean | null; apartments: number | null; towers: number | null; start: string | null; completion: string | null; readAt: string } | null;
  /** The builder the project is listed under; `builder` is the company name as registered. */
  brand: Place | null;
  builder: string; description: string; status: Status; possession: string | null; reraId: string | null; totalUnits: number | null; amenities: string[];
  /** Set when the project came from a public RERA register and the builder has not confirmed it. */
  registerSource: string | null; registerName: string | null; registerStatus: string | null; registerValidUntil: string | null; sourceUrl: string | null; sourceFetchedAt: string | null;
  locality: Place; city: Place & { state: string }; properties: PropertyCard[]; stats: Stats; bhk: { bhk: number; count: number; minPrice: number | null }[];
  /** Every photo of the project, cover first. */
  photos?: { file: string; width: number; height: number; category?: string | null }[];
  /** YouTube videos of the project. */
  videos?: { youtubeId: string; title: string | null }[];
  /** Agents our team has verified who sell this project. */
  agents?: { id: string; name: string; firmName: string | null; yearsInBusiness: number | null; level: number; label: string }[];
}
export interface Listing { items: PropertyCard[]; total: number; stats: Stats }
export interface PropertyDetail extends Omit<PropertyCard, 'locality' | 'project' | 'confidence'> {
  /** YouTube videos of the home. */
  videos?: { youtubeId: string; title: string | null }[];
  /** 'seller': an owner or agent posted it and their contact is shown after an enquiry. 'callback': it takes a lead instead. */
  contact: 'seller' | 'callback';
  confidence: Confidence; seller: { name: string; firmName: string | null; confidence: Confidence } | null;
  description: string; floor: number | null; totalFloors: number | null; facing: string | null; furnishing: string | null; amenities: string[]; listedBy: string;
  locality: Place & { highlights: string[] }; city: Place & { state: string }; project: (Place & { builder: string; reraId: string | null }) | null;
  localityStats: Stats; similar: PropertyCard[];
  /** Government charges for the home's city; null when there are none on record. */
  costs: CityCosts | null;
}
export type CompareHome = Omit<PropertyDetail, 'similar'>;
/** A builder's project in an answer from the assistant. */
export type ProjectHit = { slug: string; name: string; builder: string; brand: Place | null; registerSource: string | null; registerStatus: string | null; registerValidUntil: string | null; agents?: number; photos?: { file: string; width?: number; height?: number }[]; locality: Place; city: Place };
export interface AskResult { reply: string; live: boolean; properties: PropertyCard[]; total: number; page: { path: string; label: string } | null; relaxed: string | null; projects?: ProjectHit[]; projectsTotal?: number; land?: LandItem[] }
export interface Turn { role: 'user' | 'assistant'; text: string }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    await sessionReady();
    // A signed-in buyer's requests carry their session: it guards their account, and keeps their enquiries on it.
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...(init?.headers as Record<string, string> | undefined), ...authHeader() } });
  } catch {
    throw new Error(`Cannot reach the server at ${API_URL}. Check that the API is running and the phone is on the same wifi.`);
  }
  // A session the server no longer knows (signed out elsewhere, or the account was deleted) is dropped here too.
  if (res.status === 401 && authHeader().authorization) await endSession();
  if (!res.ok) {
    // The API explains what was wrong (for example an invalid phone number); show that when there is one.
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(typeof detail?.message === 'string' ? detail.message : res.status === 404 ? 'Not found.' : `The server answered ${res.status}.`);
  }
  return (await res.json()) as T;
}

export const getCities = () => call<CitySummary[]>('/cities');
export const getLocality = (city: string, slug: string) => call<LocalityDetail>(`/localities/${city}/${slug}`);
export const getListing = (city: string, locality: string) => call<Listing>(`/properties?city=${city}&locality=${locality}&pageSize=48`);
export const getBuilders = () => call<BuilderSummary[]>('/builders');
/** One builder's projects in a city. A builder that was merged into another answers with where it went. */
export const getBuilder = (slug: string, city: string) => call<BuilderDetail | { movedTo: string }>(`/builders/${encodeURIComponent(slug)}?city=${encodeURIComponent(city)}`);
export const getProject = (slug: string) => call<ProjectDetail>(`/projects/${slug}`);
/** Leaves the buyer's details for a call back about a builder's project. */
export const sendProjectEnquiry = (slug: string, body: { name: string; phone: string; interest?: string } & Plans) =>
  call<LeadResult>(`/projects/${slug}/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
export const getProperty = (slug: string) => call<PropertyDetail>(`/properties/${slug}`);
/** A builder project in a side-by-side comparison. */
export type CompareProject = Omit<ProjectDetail, 'properties'> & { homes: number; builderProjects: number; localityProjects: number; highlights: string[] };
export const getCompareProjects = (slugs: string[]) => call<CompareProject[]>(`/compare/projects?slugs=${encodeURIComponent(slugs.slice(0, 4).join(','))}`);
export type Tone = 'good' | 'warn' | 'info' | 'none';
export interface Scorecard { slug: string; tag: { tone: Tone; text: string }; checks: { label: string; tone: Tone; text: string }[] }
export interface Insight { key: string; tone: Tone; icon: string; title: string; text: string; slugs: string[] }
/** A comparison with what a buyer should notice about it. */
export const getProjectInsights = (slugs: string[]) => call<{ projects: CompareProject[]; scorecards: Scorecard[]; insights: Insight[] }>(`/compare/projects/insights?slugs=${encodeURIComponent(slugs.slice(0, 4).join(','))}`);
export const getLocalityInsights = (city: string, a: string, b: string) => call<{ localities: [LocalityDetail, LocalityDetail]; scorecards: Scorecard[]; insights: Insight[] }>(`/compare/localities/${encodeURIComponent(city)}?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
export const getHomeInsights = (slugs: string[]) => call<{ homes: CompareHome[]; scorecards: Scorecard[]; insights: Insight[] }>(`/compare/insights?slugs=${encodeURIComponent(slugs.slice(0, 4).join(','))}`);
export const followProject = (slug: string, email: string) => call<{ ok: true }>(`/projects/${slug}/follow`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, consent: true }) });
// ---- The buyer's own account
export interface SavedItem { kind: 'project' | 'property'; slug: string; name: string; sub: string; priceInr?: number; photo: { file: string; width?: number; height?: number } | null; registerStatus?: string | null; registerValidUntil?: string | null; note: string | null; savedAt: string }
export interface SentEnquiry { at: string; wantsVisit: boolean; about: { kind: 'project' | 'property'; slug: string; name: string } | null; agent: { name: string; phone: string | null } | null }
export interface Account { email: string; saved: SavedItem[]; enquiries: SentEnquiry[]; alerts: { id: string; label: string }[]; follows: { id: string; slug: string; name: string }[] }
const JSON_POST = { method: 'POST', headers: { 'content-type': 'application/json' } } as const;
export const requestCode = (email: string) => call<{ ok: true }>('/me/code', { ...JSON_POST, body: JSON.stringify({ email }) });
export const verifyCode = (email: string, code: string) => call<{ token: string; email: string }>('/me/verify', { ...JSON_POST, body: JSON.stringify({ email, code }) });
export const getAccount = () => call<Account>('/me');
export const saveItem = (kind: 'project' | 'property', slug: string, note?: string) => call<{ ok: true }>('/me/saved', { ...JSON_POST, body: JSON.stringify({ kind, slug, note }) });
export const unsaveItem = (kind: 'project' | 'property', slug: string) => call<{ ok: true }>(`/me/saved/${kind}/${slug}`, { method: 'DELETE' });
export const createAlert = (body: { kind: 'PROJECTS' | 'HOMES'; city: string; locality?: string; maxPrice?: number; bhk?: number; email?: string }) => call<{ ok: true; label: string }>('/alerts', { ...JSON_POST, body: JSON.stringify({ ...body, consent: true }) });
export const stopAlert = (kind: 'alerts' | 'follows', id: string) => call<{ ok: true }>(`/me/${kind}/${id}`, { method: 'DELETE' });
export const signOutAccount = () => call<{ ok: true }>('/me/signout', { method: 'POST' });

// ---- Upcoming projects: told to us by a builder or verified agent, not yet on a RERA register
export interface UpcomingItem { slug: string; name: string; builder: string; about: string | null; expected: string | null; youtubeId: string | null; videoTitle: string | null; locality: Place; city: Place; waiting: number; sharedBy: { name: string; as: string } | null }
export const getUpcoming = () => call<{ notice: string; items: UpcomingItem[] }>('/upcoming');
export const getUpcomingOne = (slug: string) => call<UpcomingItem & { notice: string; registeredAs: Place | null }>(`/upcoming/${slug}`);
export const notifyUpcoming = (slug: string, email?: string) => call<{ ok: true }>(`/upcoming/${slug}/notify`, { ...JSON_POST, body: JSON.stringify({ email, consent: true }) });

export const searchProjects = (text: string, city?: string) => call<{ total: number; items: ProjectHit[] }>(`/projects?text=${encodeURIComponent(text.slice(0, 80))}${city ? `&city=${encodeURIComponent(city)}` : ''}`);
export const getCompare = (slugs: string[]) => call<CompareHome[]>(`/compare?slugs=${encodeURIComponent(slugs.slice(0, 4).join(','))}`);
export const ask = (message: string, history: Turn[], context?: string) =>
  call<AskResult>('/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, history, context }) });

/** Address of a stored listing photo. */
export const photoUrl = (file: string, size: 'full' | 'card' = 'full') => `${API_URL}/uploads/${size === 'card' ? file.replace(/\.webp$/, '-card.webp') : file}`;

export const REPORT_REASONS = [
  ['ASKED_ADVANCE', 'Asked to pay before a visit or papers'], ['FAKE_LISTING', 'Home does not exist or is not for sale'], ['NOT_THE_OWNER', 'Seller is not the owner'],
  ['WRONG_DETAILS', 'Details are not as listed'], ['UNREACHABLE', 'Seller never answers or was abusive'], ['OTHER', 'Something else'],
] as const;
/** Reports a listing or its seller. Our team looks into it; the seller is not told who reported them. */
export const sendReport = (slug: string, body: { reason: string; details: string; name: string; phone: string; email?: string }) =>
  call<{ ok: true; token: string }>(`/properties/${slug}/reports`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** What comes back from an enquiry: the seller of an owner's or agent's home, or the verified agent the buyer was connected to, or neither (a call back). */
export interface LeadResult { ok: true; seller?: { name: string; phone: string; level?: number | null; label?: string } | null; agent?: { name: string; phone: string; firmName: string | null; level: number; label: string } | null }
export type EnquiryResult = LeadResult;
/** Asks the seller to get in touch; the answer includes the seller's contact when the listing has a seller account. */
/** What a buyer can say about their plans on an enquiry. The codes match the API's lead scoring. */
export const TIMELINES = [['NOW', 'Within a month'], ['SOON', '1 to 3 months'], ['LATER', '3 to 6 months'], ['EXPLORING', 'Just exploring']] as const;
export interface Plans { timeline?: string; wantsVisit?: boolean; /** 'agent': connect the buyer to a verified agent selling the project. */ via?: 'agent' }
export const sendEnquiry = (slug: string, body: { name: string; phone: string; message?: string } & Plans) =>
  call<EnquiryResult>(`/properties/${slug}/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

// ---- Land and commercial space: listings anywhere in India, and what companies are looking for
export interface LandItem {
  slug: string; kind: string; deal: string; title: string; kindLabel: string; state: string; stateSlug: string; district: string; districtSlug: string; place: string;
  area: string; areaAlso: string | null; rate: string | null; priceInr: number | null; roadFt: number | null; highway: string | null; highwayKm: number | null; landUse: string | null; posterIs: string; createdAt: string; photos: { file: string; width: number; height: number }[];
}
export type LandDetail = LandItem & { description: string | null; closed: boolean; features: string[]; clearHeightFt: number | null; powerKva: number | null; docks: number | null; checks: { key: string; title: string; why: string }[]; nearby: LandItem[] };
export interface WantedItem { slug: string; kind: string; deal: string; purpose: string; purposeLabel: string; kindLabel: string; title: string; details: string | null; state: string; stateSlug: string; where: string | null; size: string; budgetInr: number | null; by: string | null; answers: number; createdAt: string }
export interface LandOptions { states: Place[]; kinds: { code: string; label: string }[]; purposes: { code: string; label: string }[]; units: { code: string; label: string; local: boolean }[]; landUses: string[]; features: { code: string; label: string }[] }
export interface LandMine { type: 'listing' | 'wanted'; slug: string; title: string; status: string; note: string | null; replies: number }
export const getLand = (q: { kind?: string; deal?: string } = {}) => call<{ total: number; items: LandItem[] }>(`/land?take=40${q.kind ? `&kind=${q.kind}` : ''}${q.deal ? `&deal=${q.deal}` : ''}`);
export const getLandPlaces = () => call<{ kinds: { kind: string; label: string; count: number }[]; wanted: number }>('/land/places');
export const getLandOne = (slug: string) => call<LandDetail>(`/land/listing/${encodeURIComponent(slug)}`);
export const getWanted = () => call<{ items: WantedItem[] }>('/land/wanted?take=30');
export const getWantedOne = (slug: string) => call<WantedItem & { closed: boolean }>(`/land/wanted/${encodeURIComponent(slug)}`);
export const getLandOptions = () => call<LandOptions>('/land/options');
export const postLand = (type: 'listing' | 'wanted', body: Record<string, unknown>) => call<{ ok: true; slug: string; token: string }>(type === 'listing' ? '/land' : '/land/wanted', { ...JSON_POST, body: JSON.stringify({ ...body, consent: true }) });
export const replyLand = (type: 'listing' | 'wanted', slug: string, body: { name: string; phone: string; message?: string }) => call<{ ok: true }>(type === 'listing' ? `/land/listing/${encodeURIComponent(slug)}/enquire` : `/land/wanted/${encodeURIComponent(slug)}/answer`, { ...JSON_POST, body: JSON.stringify({ ...body, consent: true }) });
export const landMine = (token: string) => call<LandMine>('/land/manage', { ...JSON_POST, body: JSON.stringify({ token }) });
export const closeLand = (token: string) => call<{ ok: true }>('/land/manage', { ...JSON_POST, body: JSON.stringify({ token, close: true }) });
/**
 * Sends one photo for a listing, with the key that came back when it was posted. On a phone the picker gives a file
 * address, which the upload reads directly; in the web preview the same address is turned into the file's bytes first.
 */
export async function uploadLandPhoto(token: string, photo: { uri: string; mimeType?: string | null }): Promise<void> {
  const form = new FormData();
  form.append('token', token);
  if (Platform.OS === 'web') form.append('photos', await (await fetch(photo.uri)).blob(), 'photo.jpg');
  else form.append('photos', { uri: photo.uri, name: 'photo.jpg', type: photo.mimeType ?? 'image/jpeg' } as unknown as Blob);
  await call<{ ok: true }>('/land/photos', { method: 'POST', body: form });
}

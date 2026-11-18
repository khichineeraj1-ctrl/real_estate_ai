import { API_URL } from './config';

export type PropertyType = 'APARTMENT' | 'VILLA' | 'BUILDER_FLOOR' | 'PLOT';
export type Status = 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION';
export interface Place { slug: string; name: string }
export interface Stats { count: number; minPrice: number | null; maxPrice: number | null; avgRate: number | null }
export interface PropertyCard {
  slug: string; title: string; type: PropertyType; bhk: number; bathrooms: number; priceInr: number; areaSqft: number; status: Status; possession: string | null;
  locality: Place & { city: Place }; project: (Place & { builder: string }) | null;
  /** The cover only on cards; every photo on the detail screen. */
  photos: { file: string }[];
}
export interface CitySummary extends Place { state: string; localities: Place[]; stats: Stats }
export interface LocalityDetail extends Place { intro: string; highlights: string[]; city: Place & { state: string }; stats: Stats }
export interface Listing { items: PropertyCard[]; total: number; stats: Stats }
export interface PropertyDetail extends Omit<PropertyCard, 'locality' | 'project'> {
  description: string; floor: number | null; totalFloors: number | null; facing: string | null; furnishing: string | null; amenities: string[]; listedBy: string;
  locality: Place & { highlights: string[] }; city: Place & { state: string }; project: (Place & { builder: string; reraId: string | null }) | null;
  localityStats: Stats; similar: PropertyCard[];
}
export interface AskResult { reply: string; live: boolean; properties: PropertyCard[]; total: number; page: { path: string; label: string } | null; relaxed: string | null }
export interface Turn { role: 'user' | 'assistant'; text: string }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error(`Cannot reach the server at ${API_URL}. Check that the API is running and the phone is on the same wifi.`);
  }
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
export const getProperty = (slug: string) => call<PropertyDetail>(`/properties/${slug}`);
export const ask = (message: string, history: Turn[], context?: string) =>
  call<AskResult>('/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, history, context }) });

/** Address of a stored listing photo. */
export const photoUrl = (file: string, size: 'full' | 'card' = 'full') => `${API_URL}/uploads/${size === 'card' ? file.replace(/\.webp$/, '-card.webp') : file}`;

export interface EnquiryResult { ok: true; seller: { name: string; phone: string } | null }
/** Asks the seller to get in touch; the answer includes the seller's contact when the listing has a seller account. */
export const sendEnquiry = (slug: string, body: { name: string; phone: string; message?: string }) =>
  call<EnquiryResult>(`/properties/${slug}/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

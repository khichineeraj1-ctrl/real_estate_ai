import { km } from './locality-insights';

/**
 * What is near a project: straight-line distances to the places our team keeps for its city. Straight line because it
 * can be stated exactly; the road is always longer, and the page says so.
 */
export const LANDMARK_KINDS = ['METRO', 'RAIL', 'AIRPORT', 'HUB', 'SCHOOL', 'HOSPITAL', 'MALL'] as const;
export type LandmarkKind = (typeof LANDMARK_KINDS)[number];
export const LANDMARK_LABEL: Record<LandmarkKind, string> = { METRO: 'Metro', RAIL: 'Railway station', AIRPORT: 'Airport', HUB: 'Offices and business districts', SCHOOL: 'Schools', HOSPITAL: 'Hospitals', MALL: 'Shopping' };
export const LANDMARK_ICON: Record<LandmarkKind, string> = { METRO: '🚇', RAIL: '🚆', AIRPORT: '✈️', HUB: '🏢', SCHOOL: '🏫', HOSPITAL: '🏥', MALL: '🛍️' };
/** How many of each to show, and how far is still "near". An airport is always shown, however far. */
const SHOW: Record<LandmarkKind, { take: number; within: number }> = { METRO: { take: 3, within: 12 }, RAIL: { take: 2, within: 40 }, AIRPORT: { take: 1, within: Infinity }, HUB: { take: 4, within: 30 }, SCHOOL: { take: 3, within: 8 }, HOSPITAL: { take: 3, within: 12 }, MALL: { take: 3, within: 12 } };

export interface Spot { kind: string; name: string; lat: number; lng: number }
export function nearby(from: { lat: number; lng: number }, spots: Spot[]) {
  return LANDMARK_KINDS.map((kind) => {
    const rule = SHOW[kind];
    const items = spots.filter((s) => s.kind === kind).map((s) => ({ name: s.name, km: km(from, s) })).filter((s) => s.km <= rule.within).sort((a, b) => a.km - b.km).slice(0, rule.take);
    return { kind, label: LANDMARK_LABEL[kind], icon: LANDMARK_ICON[kind], items };
  }).filter((g) => g.items.length > 0);
}

/** A pin as pasted from a map: "28.4089, 77.0421". India only, so a swapped or mistyped pair is caught. */
export function readPin(text: string): { lat: number; lng: number } | null {
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(text);
  if (!m) return null;
  const lat = Number(m[1]); const lng = Number(m[2]);
  return lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 97.5 ? { lat, lng } : null;
}
/** Lines of "Kind | Name | lat, lng" for adding many places at once. */
export function readLandmarks(text: string): { rows: Spot[]; error?: string } {
  const rows: Spot[] = [];
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [kindRaw, name, pinRaw] = line.split('|').map((x) => x.trim());
    const kind = (kindRaw ?? '').toUpperCase();
    if (!(LANDMARK_KINDS as readonly string[]).includes(kind)) return { rows, error: `“${line.slice(0, 50)}”: the first part must be one of ${LANDMARK_KINDS.join(', ')}` };
    if (!name || name.length > 120) return { rows, error: `“${line.slice(0, 50)}”: give the place a name (under 120 characters)` };
    const pin = readPin(pinRaw ?? '');
    if (!pin) return { rows, error: `“${line.slice(0, 50)}”: the last part must be a pin in India, like 28.4089, 77.0421` };
    rows.push({ kind, name, ...pin });
  }
  return rows.length > 200 ? { rows, error: 'At most 200 lines at a time' } : { rows };
}

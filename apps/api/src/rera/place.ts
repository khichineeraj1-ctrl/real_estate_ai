import type { RegisterEntry } from './parse';

/** A locality of ours that a register entry could belong to. */
export interface Spot { id: string; slug: string; name: string; citySlug: string; lat: number; lng: number }

/** Which of our cities each register covers. */
export const CITY_OF = { HARYANA: ['gurgaon'], KARNATAKA: ['bengaluru'], MAHARASHTRA: ['mumbai', 'pune'] } as const;

/**
 * Other ways a register refers to a locality: mostly the sector numbers that make up a named road or area.
 * Keyed by "city/locality" using our own addresses. Conservative on purpose: an entry that matches nothing is left
 * unplaced for a person to decide, which is better than a project shown in the wrong area.
 */
export const ALIASES: Record<string, RegExp[]> = {
  'gurgaon/golf-course-road': [/\bGOLF COURSE ROAD\b/i, /\bSECTOR[\s-]*(42|43|53|54)\b/i],
  'gurgaon/sohna-road': [/\bSOHNA ROAD\b/i, /\bSECTOR[\s-]*(47|48|49)\b/i],
  'gurgaon/dwarka-expressway': [/\bDWARKA EXPRESSWAY\b/i, /\bSECTOR[\s-]*(99|10\d|11[0-3])\b/i],
  'gurgaon/dlf-phase-3': [/\bDLF\b.*\bPHASE[\s-]*(3|III)\b/i, /\bSECTOR[\s-]*24\b/i],
};

/** Pincodes to ask MahaRERA for, per locality. Its search is by pincode; the map position then decides the locality. */
export const PINCODES: Record<string, string[]> = {
  'mumbai/powai': ['400076'], 'mumbai/andheri-west': ['400053', '400058', '400061'], 'mumbai/thane-west': ['400601', '400607', '400610'],
  'mumbai/chembur': ['400071', '400074', '400089'], 'mumbai/borivali-west': ['400091', '400092', '400103'], 'mumbai/mira-road': ['401107'],
  'pune/hinjewadi': ['411057'], 'pune/wakad': ['411057'], 'pune/baner': ['411045'], 'pune/kharadi': ['411014'], 'pune/viman-nagar': ['411014'], 'pune/hadapsar': ['411028', '411013'],
};

/** How far a project's map position may be from a locality's centre and still be placed in it. */
export const MAX_KM = 3.5;

export function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The locality's own name as a whole phrase: "Sector 57" must not match "Sector 57A" or "Sector 157". */
const named = (name: string) => new RegExp(`(^|[^A-Za-z0-9])${escape(name).replace(/\s+/g, '[\\s-]*')}(?![A-Za-z0-9])`, 'i');

/**
 * The locality a register entry belongs in, or null when that cannot be told with confidence.
 * With a map position: the nearest locality, if it is within MAX_KM. Without one: a locality named in the register's
 * location text, or failing that in the project's own name ("Prestige Whitefield …"). Two different matches mean no
 * placement.
 */
/** Two localities this close can share a pincode boundary, so a pincode of one does not contradict a position in the other. */
export const NEIGHBOUR_KM = 5;

export function place(entry: Pick<RegisterEntry, 'source' | 'name' | 'locationText' | 'lat' | 'lng'> & { pincode?: string | null }, spots: Spot[]): { spot: Spot; how: string } | null {
  const candidates = spots.filter((s) => (CITY_OF[entry.source] as readonly string[]).includes(s.citySlug));
  if (entry.lat != null && entry.lng != null) {
    const nearest = candidates.map((s) => ({ s, d: km(entry.lat!, entry.lng!, s.lat, s.lng) })).sort((a, b) => a.d - b.d)[0];
    if (!nearest || nearest.d > MAX_KM) return null;
    // Some register entries carry a map position that is not the project's (a head office, or a slip of the hand).
    // The pincode is entered separately, so the two are checked against each other: if the pincode belongs to
    // localities of ours that are nowhere near the position, the entry is left for a person.
    if (entry.pincode) {
      const byPincode = candidates.filter((s) => (PINCODES[`${s.citySlug}/${s.slug}`] ?? []).includes(entry.pincode!));
      if (byPincode.length && !byPincode.some((s) => s.id === nearest.s.id || km(s.lat, s.lng, nearest.s.lat, nearest.s.lng) <= NEIGHBOUR_KM)) return null;
    }
    return { spot: nearest.s, how: `map position, ${nearest.d.toFixed(1)} km from the centre of ${nearest.s.name}` };
  }
  // Karnataka's location is a taluk, an administrative area far larger than a locality of the same name
  // (Yelahanka taluk covers much of north Bengaluru), so it is never used to place a project.
  const locationIsPrecise = entry.source !== 'KARNATAKA';
  const matches = (hay: string) => candidates.filter((s) => named(s.name).test(hay) || (ALIASES[`${s.citySlug}/${s.slug}`] ?? []).some((re) => re.test(hay)));
  const byLocation = locationIsPrecise ? matches(entry.locationText) : [];
  if (byLocation.length === 1) return { spot: byLocation[0], how: `the register gives its location as “${entry.locationText}”` };
  if (byLocation.length > 1) return null;
  const byName = candidates.filter((s) => named(s.name).test(entry.name));
  return byName.length === 1 ? { spot: byName[0], how: `“${byName[0].name}” is in the project’s registered name` } : null;
}

/**
 * The amenities a project can have, as a fixed list, so two projects can be compared like for like and the same word
 * always means the same thing. Each has a group and a small picture. Text outside this list is kept and shown under
 * "Other", so nothing a builder said is lost.
 */
export const AMENITY_GROUPS = ['Sports and fitness', 'Leisure', 'Children', 'Safety', 'Convenience', 'Green and open'] as const;
type Group = (typeof AMENITY_GROUPS)[number];
export const AMENITIES: Record<string, { label: string; group: Group; icon: string }> = {
  POOL: { label: 'Swimming pool', group: 'Sports and fitness', icon: '🏊' }, GYM: { label: 'Gym', group: 'Sports and fitness', icon: '🏋️' },
  TENNIS: { label: 'Tennis court', group: 'Sports and fitness', icon: '🎾' }, BADMINTON: { label: 'Badminton court', group: 'Sports and fitness', icon: '🏸' },
  BASKETBALL: { label: 'Basketball court', group: 'Sports and fitness', icon: '🏀' }, CRICKET: { label: 'Cricket pitch or nets', group: 'Sports and fitness', icon: '🏏' },
  JOGGING: { label: 'Jogging track', group: 'Sports and fitness', icon: '🏃' }, YOGA: { label: 'Yoga or meditation area', group: 'Sports and fitness', icon: '🧘' },
  SQUASH: { label: 'Squash court', group: 'Sports and fitness', icon: '🥎' },
  CLUBHOUSE: { label: 'Clubhouse', group: 'Leisure', icon: '🏛️' }, HALL: { label: 'Party or community hall', group: 'Leisure', icon: '🎉' },
  THEATRE: { label: 'Mini theatre', group: 'Leisure', icon: '🎬' }, SPA: { label: 'Spa or sauna', group: 'Leisure', icon: '💆' },
  INDOOR_GAMES: { label: 'Indoor games room', group: 'Leisure', icon: '🎱' }, CAFE: { label: 'Café or restaurant', group: 'Leisure', icon: '☕' },
  LIBRARY: { label: 'Library', group: 'Leisure', icon: '📚' }, COWORK: { label: 'Co-working space', group: 'Leisure', icon: '💻' },
  PLAY_AREA: { label: 'Children’s play area', group: 'Children', icon: '🛝' }, KIDS_POOL: { label: 'Children’s pool', group: 'Children', icon: '🚸' },
  CRECHE: { label: 'Crèche or day care', group: 'Children', icon: '🧸' }, SCHOOL_INSIDE: { label: 'School inside the project', group: 'Children', icon: '🏫' },
  SECURITY: { label: '24-hour security', group: 'Safety', icon: '🛡️' }, CCTV: { label: 'CCTV cameras', group: 'Safety', icon: '📹' },
  GATED: { label: 'Gated entry', group: 'Safety', icon: '🚧' }, FIRE: { label: 'Fire safety systems', group: 'Safety', icon: '🧯' },
  INTERCOM: { label: 'Intercom or video door phone', group: 'Safety', icon: '📞' },
  POWER_BACKUP: { label: 'Power backup', group: 'Convenience', icon: '🔋' }, LIFT: { label: 'Lifts', group: 'Convenience', icon: '🛗' },
  PARKING: { label: 'Covered parking', group: 'Convenience', icon: '🅿️' }, VISITOR_PARKING: { label: 'Visitor parking', group: 'Convenience', icon: '🚗' },
  EV: { label: 'EV charging points', group: 'Convenience', icon: '🔌' }, SHOPS: { label: 'Shops inside the project', group: 'Convenience', icon: '🛒' },
  WATER: { label: '24-hour water supply', group: 'Convenience', icon: '🚰' }, PIPED_GAS: { label: 'Piped gas', group: 'Convenience', icon: '🔥' },
  CLINIC: { label: 'Clinic or pharmacy', group: 'Convenience', icon: '⚕️' }, CONCIERGE: { label: 'Concierge or maintenance staff', group: 'Convenience', icon: '🛎️' },
  GARDEN: { label: 'Landscaped gardens', group: 'Green and open', icon: '🌳' }, PARK: { label: 'Central park or lawn', group: 'Green and open', icon: '🏞️' },
  RAINWATER: { label: 'Rainwater harvesting', group: 'Green and open', icon: '💧' }, SOLAR: { label: 'Solar power', group: 'Green and open', icon: '☀️' },
  STP: { label: 'Sewage treatment plant', group: 'Green and open', icon: '♻️' }, PET: { label: 'Pet area', group: 'Green and open', icon: '🐕' },
  CYCLING: { label: 'Cycling track', group: 'Green and open', icon: '🚲' },
};
export const amenityOptions = () => AMENITY_GROUPS.map((group) => ({ group, items: Object.entries(AMENITIES).filter(([, a]) => a.group === group).map(([code, a]) => ({ code, label: a.label, icon: a.icon })) }));

/** Stored values (codes, or older free text) as plain names, in the order kept. */
export const amenityNames = (stored: string[]) => stored.map((s) => AMENITIES[s]?.label ?? s);
/** The same, sorted into groups for the project page; free text lands under "Other". */
export function amenityGroups(stored: string[]): { group: string; items: { label: string; icon: string }[] }[] {
  const seen = new Set<string>();
  const unique = stored.filter((s) => { const k = (AMENITIES[s]?.label ?? s).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  const groups = AMENITY_GROUPS.map((group) => ({ group: group as string, items: unique.filter((s) => AMENITIES[s]?.group === group).map((s) => ({ label: AMENITIES[s].label, icon: AMENITIES[s].icon })) }));
  const other = unique.filter((s) => !AMENITIES[s]).map((s) => ({ label: s, icon: '✓' }));
  return [...groups, { group: 'Other', items: other }].filter((g) => g.items.length > 0);
}

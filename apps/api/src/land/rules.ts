/**
 * The rules for land and commercial space: what can be listed, how sizes are understood, and what a buyer is told to
 * check. Pure functions only, so they can be tested without a database.
 */
import { slugify } from '../admin/input';

export const KINDS = ['FARM', 'PLOT', 'INDUSTRIAL', 'BUILT'] as const;
export type Kind = (typeof KINDS)[number];
export const DEALS = ['SALE', 'LEASE'] as const;
export type Deal = (typeof DEALS)[number];
export const PURPOSES = ['WAREHOUSE', 'DARK_STORE', 'FACTORY', 'RETAIL', 'FARMING', 'HOUSING', 'OTHER'] as const;
export const POSTERS = ['OWNER', 'DEALER', 'COMPANY'] as const;
export const LAND_USES = ['AGRICULTURAL', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'] as const;

export const KIND_LABEL: Record<Kind, string> = { FARM: 'Farm land', PLOT: 'Plot', INDUSTRIAL: 'Industrial land', BUILT: 'Warehouse or shop' };
export const PURPOSE_LABEL: Record<(typeof PURPOSES)[number], string> = { WAREHOUSE: 'Warehouse', DARK_STORE: 'Dark store', FACTORY: 'Factory', RETAIL: 'Shop or showroom', FARMING: 'Farming', HOUSING: 'Housing', OTHER: 'Other use' };

/** Things a poster can tick. Kept as short codes so they can be filtered and shown the same everywhere. */
export const FEATURES: Record<string, string> = {
  ROAD_TOUCH: 'Touches a paved road', CORNER: 'Corner', BOUNDARY: 'Boundary wall or fencing', WATER: 'Borewell or canal water',
  POWER: 'Electricity connection', CLEAR_TITLE: 'Seller says title is clear', CONVERTED: 'Land use already converted', TRUCK: 'Trucks can reach it',
  GROUND_FLOOR: 'Ground floor', PARKING: 'Parking or loading space',
};

/**
 * Units with one size everywhere in India, in square feet. Bigha, katha, biswa and marla are left out on purpose:
 * their size changes from state to state and sometimes district to district, so we show them as given and never
 * convert them.
 */
export const UNIT_SQFT: Record<string, number> = { sqft: 1, sqyd: 9, sqm: 10.7639, acre: 43_560, hectare: 107_639, guntha: 1_089, cent: 435.6, kanal: 5_445, ground: 2_400 };
export const LOCAL_UNITS = ['bigha', 'katha', 'biswa', 'marla'] as const;
export const UNITS = [...Object.keys(UNIT_SQFT), ...LOCAL_UNITS];
export const UNIT_LABEL: Record<string, [string, string]> = {
  sqft: ['sq ft', 'sq ft'], sqyd: ['sq yd (gaj)', 'sq yd'], sqm: ['sq m', 'sq m'], acre: ['acre', 'acres'], hectare: ['hectare', 'hectares'], guntha: ['guntha', 'guntha'],
  cent: ['cent', 'cents'], kanal: ['kanal', 'kanal'], ground: ['ground', 'grounds'], bigha: ['bigha', 'bigha'], katha: ['katha', 'katha'], biswa: ['biswa', 'biswa'], marla: ['marla', 'marla'],
};
export const toSqft = (value: number, unit: string): number | null => (unit in UNIT_SQFT ? value * UNIT_SQFT[unit] : null);

const trim = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-IN') : String(Number(n.toFixed(2))));
export const areaText = (value: number, unit: string) => `${trim(value)} ${UNIT_LABEL[unit]?.[value === 1 ? 0 : 1] ?? unit}`;
/** The size in a second, familiar unit: acres for anything of a quarter acre or more, square feet below that. */
export function areaAlso(value: number, unit: string): string | null {
  const sqft = toSqft(value, unit);
  if (sqft == null) return null;
  if (sqft >= UNIT_SQFT.acre / 4) return unit === 'acre' ? null : areaText(sqft / UNIT_SQFT.acre, 'acre');
  return unit === 'sqft' ? null : areaText(sqft, 'sqft');
}

export function rupees(n: number): string {
  if (n >= 1e7) return `₹${Number((n / 1e7).toFixed(2))} Cr`;
  if (n >= 1e5) return `₹${Number((n / 1e5).toFixed(2))} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
/** The price in the terms buyers compare by: per acre for large land, per sq ft for small plots and for rent. */
export function rate(l: { deal: string; priceInr: number | null; areaValue: number; areaUnit: string }): string | null {
  if (!l.priceInr) return null;
  const sqft = toSqft(l.areaValue, l.areaUnit);
  if (sqft == null) return `${rupees(l.priceInr / l.areaValue)} per ${UNIT_LABEL[l.areaUnit]?.[0] ?? l.areaUnit}${l.deal === 'LEASE' ? ' a month' : ''}`;
  if (l.deal === 'LEASE') return `₹${Number((l.priceInr / sqft).toFixed(1))} per sq ft a month`;
  return sqft >= UNIT_SQFT.acre / 4 ? `${rupees(l.priceInr / (sqft / UNIT_SQFT.acre))} per acre` : `₹${Math.round(l.priceInr / sqft).toLocaleString('en-IN')} per sq ft`;
}

export interface Check { key: string; title: string; why: string }
/**
 * What to check before paying, by kind. Written as questions to ask and papers to see, never as a statement of what
 * the law is in a given state: the rules on who may buy farm land, and on changing land use, differ by state.
 */
export function landChecks(l: { kind: string; deal: string; landUse: string | null; areaUnit: string }): Check[] {
  const out: Check[] = [];
  const lease = l.deal === 'LEASE';
  if (!(l.areaUnit in UNIT_SQFT)) out.push({ key: 'unit', title: `Ask what one ${l.areaUnit} is here, in acres or square feet`, why: `A ${l.areaUnit} is not the same size everywhere. Get the size in a fixed unit in writing before you compare prices.` });
  out.push({ key: 'records', title: 'See the land record in the owner’s name', why: 'Ask for the current record of rights from the state’s land records (called jamabandi, khatauni, 7/12, RTC, patta or pahani depending on the state) and check the name, survey number and area against what you are shown.' });
  if (!lease) {
    out.push({ key: 'owners', title: 'Find out who else must sign', why: 'Family land often has several co-owners. Every one of them, or someone holding their registered power of attorney, has to sign the sale.' });
    out.push({ key: 'loans', title: 'Check for loans and disputes on the land', why: 'Ask for an encumbrance certificate from the sub-registrar’s office and ask in the village whether there is a court case, a loan or a tenant on it.' });
  }
  if (l.kind === 'FARM' && !lease) out.push({ key: 'who', title: 'Check that you are allowed to buy farm land in this state', why: 'Several states restrict who can buy agricultural land, or how much. Ask the local revenue office or a lawyer before paying any advance.' });
  if (l.kind !== 'BUILT' && l.landUse !== 'INDUSTRIAL' && l.landUse !== 'COMMERCIAL') out.push({ key: 'use', title: 'If you will build on it, ask about changing its land use', why: 'A warehouse, shop or factory usually cannot be built on land recorded as agricultural until its use is changed. Ask what that needs here, how long it takes and who pays.' });
  if (l.kind === 'BUILT') out.push({ key: 'building', title: 'See the building’s approvals', why: 'Ask for the approved plan, the fire clearance if one applies, and the sanctioned electricity load, and check they match what you need to run.' });
  out.push({ key: 'access', title: 'Walk the access road yourself', why: 'Check that the road is public and not across someone else’s land, and that it is wide enough for the vehicles you will use, in the monsoon too.' });
  out.push({ key: 'measure', title: 'Have the land measured on the ground', why: 'Get the boundaries marked by the revenue surveyor (patwari, talathi or equivalent) so the area on paper matches the area you can use.' });
  out.push(lease
    ? { key: 'paper', title: 'Put the lease in writing and register it', why: 'Agree the rent, the yearly increase, the lock-in and who pays for repairs, and register the lease where the law requires it.' }
    : { key: 'paper', title: 'Pay only through the bank, against a registered deed', why: 'Keep any advance small and written down. Ownership passes only when the sale deed is registered, and the record should then be changed to your name (mutation).' });
  return out;
}

export interface Place { slug: string; name: string }
const NAMES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];
export const STATES: Place[] = NAMES.map((name) => ({ slug: slugify(name), name }));
export const stateBySlug = (slug: string) => STATES.find((s) => s.slug === slug) ?? null;

/** A district as typed by a poster, tidied so "alwar dist." and "Alwar District" land on the same page. */
export function cleanDistrict(raw: string): Place | null {
  const name = raw.replace(/\b(district|dist|distt|zila|jila)\b\.?/gi, ' ').replace(/[^\p{L}\p{M}\s.'-]/gu, ' ').replace(/\s+/g, ' ').trim()
    .toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());
  const slug = slugify(name);
  return name.length >= 2 && slug.length >= 2 ? { slug, name } : null;
}

export function listingTitle(l: { kind: string; deal: string; areaValue: number; areaUnit: string; place: string; district: string }): string {
  const what = l.kind === 'BUILT' ? 'warehouse or shop' : KIND_LABEL[l.kind as Kind].toLowerCase();
  return `${areaText(l.areaValue, l.areaUnit)} ${what} ${l.deal === 'LEASE' ? 'for rent' : 'for sale'} in ${l.place}, ${l.district}`;
}

/**
 * Whether a question to the assistant is about land or commercial space rather than a home, and what it narrows to.
 * "plot" on its own is not enough: homes in the cities we cover include plots too, so it counts only with a state.
 */
export function landIntent(question: string): { kind?: Kind; deal?: Deal; state?: Place; weak: boolean } | null {
  const t = ` ${question.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ')} `;
  const has = (re: RegExp) => re.test(t);
  const built = has(/\b(warehouses?|godowns?|sheds?|dark stores?|shops?|showrooms?|cold storage)\b/);
  const industrial = has(/\b(industrial|factory|factories|logistics)\b/);
  const farm = has(/\b(farm ?lands?|farmhouses?|agricultur\w+|khet\w*|orchards?|bigha)\b/); // not bare "farms" or "acres": both turn up in project names
  const plot = has(/\bplots?\b/);
  const land = has(/\b(lands?|zameen|jameen|zamin)\b/);
  const state = STATES.find((s) => t.includes(` ${s.name.toLowerCase()} `));
  if (!(built || industrial || farm || land || (plot && state))) return null;
  // "warehouse land" and "land for a factory" are land to build on; a bare "warehouse" is a building.
  const kind: Kind | undefined = (industrial || built) && land ? 'INDUSTRIAL' : built ? 'BUILT' : industrial ? 'INDUSTRIAL' : farm ? 'FARM' : plot ? 'PLOT' : undefined;
  const deal: Deal | undefined = has(/\b(rent|rental|lease|leasing|on hire)\b/) ? 'LEASE' : has(/\b(buy|sale|sell|purchase)\b/) ? 'SALE' : undefined;
  return { kind, deal, state, weak: !(built || industrial || farm || land) };
}

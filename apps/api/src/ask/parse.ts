/**
 * Turns a buyer's question ("3 bhk in whitefield under 1.5 cr, ready to move") into search filters without a model.
 * Used on its own when no Claude credentials are configured, and to resolve place names the model passes to its tool.
 */
export type PropertyType = 'APARTMENT' | 'VILLA' | 'BUILDER_FLOOR' | 'PLOT';
export type Status = 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION';
export interface Place { slug: string; name: string }
export type Gazetteer = (Place & { localities: Place[] })[];

export interface Parsed {
  city?: Place;
  locality?: Place;
  bhk?: number;
  type?: PropertyType;
  status?: Status;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc';
  /** 'price' when the buyer asks what an area costs rather than for a list of homes. */
  intent: 'search' | 'price';
}

const CITY_ALIASES: Record<string, string> = { gurugram: 'gurgaon', bangalore: 'bengaluru', bombay: 'mumbai', poona: 'pune' };
const UNIT: Record<string, number> = { cr: 1e7, crore: 1e7, crores: 1e7, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, l: 1e5, k: 1e3, thousand: 1e3 };
const AMOUNT = String.raw`(\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|l|k|thousand)\b`;

const norm = (s: string) => s.toLowerCase().replace(/[₹,]/g, ' ').replace(/\brs\.?\s*/g, ' ').replace(/(\d)\s*[-–—]\s*(\d)/g, '$1 to $2').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();

export function matchPlace(text: string | undefined, gazetteer: Gazetteer): { city?: Place; locality?: Place } {
  if (!text) return {};
  let t = ` ${norm(text)} `;
  for (const [alias, real] of Object.entries(CITY_ALIASES)) t = t.replace(new RegExp(`\\b${alias}\\b`, 'g'), real);
  const has = (name: string) => t.includes(` ${norm(name)} `) || new RegExp(`\\b${norm(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t);
  const city = gazetteer.find((c) => has(c.name));
  // Longest names first so "Andheri West" wins over a shorter name inside it; a named city narrows the search.
  const candidates = (city ? [city] : gazetteer).flatMap((c) => c.localities.map((l) => ({ l, c }))).sort((a, b) => b.l.name.length - a.l.name.length);
  const hit = candidates.find(({ l }) => has(l.name));
  if (hit) return { city: { slug: hit.c.slug, name: hit.c.name }, locality: { slug: hit.l.slug, name: hit.l.name } };
  return city ? { city: { slug: city.slug, name: city.name } } : {};
}

function budget(t: string): { minPrice?: number; maxPrice?: number } {
  const amt = (n: string, u: string) => Math.round(Number(n) * UNIT[u]);
  // "between 80 lakh and 1.2 cr", "1 to 2 crore" (the first number borrows the second's unit when it has none)
  const range = t.match(new RegExp(String.raw`(\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|l|k)?\s*(?:to|and|se)\s*${AMOUNT}`));
  if (range) {
    const hi = amt(range[3], range[4]);
    const lo = amt(range[1], range[2] ?? range[4]);
    if (lo < hi) return { minPrice: lo, maxPrice: hi };
  }
  const m = t.match(new RegExp(AMOUNT));
  if (!m) return {};
  const value = amt(m[1], m[2]);
  const before = t.slice(0, m.index);
  if (/(above|over|more than|at least|minimum|min|starting( from)?|se upar|se zyada)\s*$/.test(before) || /^\s*(\+|and above|or more|se upar|se zyada)/.test(t.slice(m.index! + m[0].length))) return { minPrice: value };
  // "under 90 lakh", "90 lakh tak", "budget 90 lakh" and a bare "90 lakh" all mean a ceiling.
  return { maxPrice: value };
}

export function parseQuestion(question: string, gazetteer: Gazetteer): Parsed {
  const t = norm(question);
  const out: Parsed = { intent: 'search', ...matchPlace(question, gazetteer) };

  const bhk = t.match(/\b([1-6])\s*(?:bhk|bed(?:room)?s?|rk)\b/);
  if (bhk) out.bhk = Number(bhk[1]);
  else if (/\bstudio\b/.test(t)) out.bhk = 1;

  if (/\b(villa|villas|independent house|bungalow|kothi)\b/.test(t)) out.type = 'VILLA';
  else if (/\b(plot|plots|land)\b/.test(t)) out.type = 'PLOT';
  else if (/\bbuilder floors?\b/.test(t)) out.type = 'BUILDER_FLOOR';
  else if (/\b(flat|flats|apartment|apartments)\b/.test(t)) out.type = 'APARTMENT';

  if (/\b(ready to move|ready possession|immediate possession|rtm|ready)\b/.test(t)) out.status = 'READY_TO_MOVE';
  else if (/\b(under construction|new launch|new launches|upcoming|pre launch)\b/.test(t)) out.status = 'UNDER_CONSTRUCTION';

  // Remove "3 bhk" and "sector 57" style numbers before looking for money, so they are not read as part of a range.
  const money = t.replace(/\b[1-6]\s*(?:bhk|bed(?:room)?s?|rk)\b/g, ' ').replace(/\b(sector|phase|block)\s*\d+\b/g, ' ');
  Object.assign(out, budget(money));

  if (/\b(cheapest|lowest|affordable|sasta|budget friendly)\b/.test(t)) out.sort = 'price_asc';
  else if (/\b(most expensive|luxury|premium|costliest)\b/.test(t)) out.sort = 'price_desc';

  if (/\b(average|avg|rate|rates|per sq\.? ?ft|per square|price trend|how much|what is the price|what are the prices|kitna|cost of)\b/.test(t) && !out.bhk && out.maxPrice == null && out.minPrice == null) out.intent = 'price';
  return out;
}

/** ₹ amounts in words a person would say and a voice can read: "₹85 lakh", "₹1.25 crore". */
export function rupees(n: number): string {
  const trim = (x: number) => String(Number(x.toFixed(2)));
  if (n >= 1e7) return `₹${trim(n / 1e7)} crore`;
  if (n >= 1e5) return `₹${trim(n / 1e5)} lakh`;
  return `₹${n.toLocaleString('en-IN')}`;
}

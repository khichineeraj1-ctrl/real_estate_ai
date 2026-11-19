import { span, type Check, type Insight, type Scorecard } from './insights';

/**
 * What a buyer choosing between listed homes should notice: value for money, the real difference in outlay and EMI,
 * space, when each can be lived in, government charges, and how far we have checked each listing.
 * Everything is arithmetic on what the seller listed and what we verified; nothing is a valuation.
 */
export interface Home {
  slug: string; title: string; price: number; area: number; bhk: number;
  ready: boolean; possession: Date | string | null; furnishing: string | null; amenities: string[];
  /** 0 not yet verified … 3 high confidence (see src/trust). */
  level: number; levelLabel: string;
  locality: { slug: string; name: string }; city: string;
  /** Average asking rate of homes listed in the locality, and how many it is drawn from. */
  areaRate: number | null; areaHomes: number;
  costs: { stampDutyPct: number; registrationPct: number; registrationCapInr: number | null } | null;
}

/** The example loan the site uses everywhere: 20% down, 8.75% a year, 20 years. */
const LOAN = { downPct: 20, ratePct: 8.75, years: 20 };
const GST = { pct: 5, affordablePct: 1, affordableUpTo: 4_500_000 };
const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const inr = (n: number) => (n >= 1e7 ? `₹${+(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${+(n / 1e5).toFixed(1)} L` : rupees(n));
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const monthYear = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const perSqft = (h: Home) => Math.round(h.price / h.area);

export function emi(price: number): number {
  const p = price * (1 - LOAN.downPct / 100); const r = LOAN.ratePct / 1200; const n = LOAN.years * 12; const f = (1 + r) ** n;
  return Math.round((p * r * f) / (f - 1));
}
export function gstOn(h: Home): number { return h.ready ? 0 : Math.round((h.price * (h.price <= GST.affordableUpTo ? GST.affordablePct : GST.pct)) / 100); }
/** Price plus estimated stamp duty, registration and GST; null where the city's rates are not on file. */
export function totalCost(h: Home): number | null {
  if (!h.costs) return null;
  const reg = Math.round((h.price * h.costs.registrationPct) / 100);
  return h.price + Math.round((h.price * h.costs.stampDutyPct) / 100) + (h.costs.registrationCapInr != null ? Math.min(reg, h.costs.registrationCapInr) : reg) + gstOn(h);
}
/** How far the asking rate sits from the locality's average, in percent; null unless at least three homes make the average. */
export function vsArea(h: Home): number | null {
  return h.areaRate && h.areaHomes >= 3 ? Math.round(((perSqft(h) - h.areaRate) / h.areaRate) * 100) : null;
}

export function homeScorecards(hs: Home[], now = new Date()): Scorecard[] {
  const lowest = (f: (h: Home) => number) => { const v = hs.map(f); const m = Math.min(...v); return v.filter((x) => x === m).length === 1 ? hs[v.indexOf(m)] : null; };
  const value = lowest(perSqft); const cheapest = lowest((h) => h.price); const biggest = lowest((h) => -h.area); const surest = lowest((h) => -h.level);
  return hs.map((h) => {
    const gap = vsArea(h); const total = totalCost(h); const due = h.possession ? new Date(h.possession) : null;
    const checks: Check[] = [
      { label: 'Price', tone: h === cheapest ? 'good' : 'info', text: inr(h.price) },
      { label: 'Rate per sq ft', tone: h === value ? 'good' : 'info', text: `${rupees(perSqft(h))}${gap == null ? '' : gap === 0 ? ', the area average' : `, ${Math.abs(gap)}% ${gap > 0 ? 'above' : 'below'} the area`}` },
      total != null ? { label: 'Full cost to buy', tone: 'info', text: `${inr(total)} with duty${h.ready ? '' : ' and GST'}` } : { label: 'Full cost to buy', tone: 'none', text: 'City charges not on file' },
      h.ready ? { label: 'Move in', tone: 'good', text: 'Ready to move' } : { label: 'Move in', tone: 'info', text: due && due > now ? `${monthYear(due)}, in ${span(due.getTime() - now.getTime())}` : 'Under construction' },
      { label: 'How far we have checked it', tone: h.level >= 2 ? 'good' : h.level === 1 ? 'info' : 'warn', text: h.levelLabel },
    ];
    const tag = h.level === 0 ? { tone: 'warn' as const, text: 'Not yet verified' }
      : h === value ? { tone: 'good' as const, text: 'Best value per sq ft' }
      : h === cheapest ? { tone: 'good' as const, text: 'Lowest price' }
      : h === biggest ? { tone: 'info' as const, text: 'Most space' }
      : h === surest ? { tone: 'good' as const, text: 'Most checked' }
      : { tone: 'info' as const, text: h.ready ? 'Ready to move' : 'Under construction' };
    return { slug: h.slug, tag, checks };
  });
}

export function homeInsights(hs: Home[], now = new Date()): Insight[] {
  if (hs.length < 2) return [];
  const out: Insight[] = [];
  const by = (f: (h: Home) => number) => [...hs].sort((a, b) => f(a) - f(b));

  // 1. Listings nobody has checked yet.
  const unchecked = hs.filter((h) => h.level === 0);
  if (unchecked.length) {
    out.push({ key: 'unverified', tone: 'warn', icon: '⚠️', slugs: unchecked.map((h) => h.slug), title: unchecked.length === hs.length ? 'None of these is verified yet' : `${list(unchecked.map((h) => h.title))} ${unchecked.length === 1 ? 'is' : 'are'} not verified yet`, text: 'We have not yet checked the seller or the papers. See the home and have its ownership papers checked before paying any booking amount.' });
  }

  // 2. Value: what a square foot costs.
  const rates = by(perSqft); const lo = rates[0]; const hi = rates[rates.length - 1];
  if (perSqft(lo) !== perSqft(hi)) {
    const gap = Math.round(((perSqft(hi) - perSqft(lo)) / perSqft(hi)) * 100);
    if (gap >= 3) out.push({ key: 'value', tone: 'good', icon: '📏', slugs: [lo.slug], title: `${lo.title} gives the most space for the money`, text: `It asks ${rupees(perSqft(lo))} a sq ft, ${gap}% less than ${hi.title} at ${rupees(perSqft(hi))}.${lo.bhk !== hi.bhk || lo.locality.slug !== hi.locality.slug ? ' They differ in size or area, so weigh that too.' : ''}` });
  }

  // 3. The real difference in outlay: price, and what it does to the EMI.
  const prices = by((h) => h.price); const cheap = prices[0]; const dear = prices[prices.length - 1];
  if (dear.price - cheap.price >= 100_000) {
    out.push({ key: 'outlay', tone: 'info', icon: '💰', slugs: [cheap.slug], title: `${cheap.title} costs ${inr(dear.price - cheap.price)} less`, text: `On a loan that is about ${rupees(emi(dear.price) - emi(cheap.price))} less every month than ${dear.title} (${rupees(emi(cheap.price))} against ${rupees(emi(dear.price))}), and ${inr(((dear.price - cheap.price) * LOAN.downPct) / 100)} less to put down. Example loan: ${LOAN.downPct}% down, ${LOAN.ratePct}% over ${LOAN.years} years.` });
  }

  // 4. Space.
  const areas = by((h) => -h.area); const big = areas[0]; const small = areas[areas.length - 1];
  if (big.area - small.area >= 100) {
    out.push({ key: 'space', tone: 'info', icon: '📐', slugs: [big.slug], title: `${big.title} is ${(big.area - small.area).toLocaleString('en-IN')} sq ft bigger`, text: `${big.area.toLocaleString('en-IN')} sq ft against ${small.area.toLocaleString('en-IN')} at ${small.title}${big.area - small.area >= 150 ? ', roughly an extra room' : ''}. Ask each seller for the carpet area: listed areas often include walls and shared space.` });
  }

  // 5. Ready now or later, and the tax that comes with waiting.
  const ready = hs.filter((h) => h.ready); const building = hs.filter((h) => !h.ready);
  if (ready.length && building.length) {
    const taxed = building.filter((h) => gstOn(h) > 0);
    const when = building.map((h) => { const d = h.possession ? new Date(h.possession) : null; return d && d > now ? `${h.title} is promised for ${monthYear(d)}` : `${h.title} has no possession date listed`; }).join('; ');
    out.push({ key: 'ready', tone: 'info', icon: '🔑', slugs: ready.map((h) => h.slug), title: `${list(ready.map((h) => h.title))} can be moved into now`, text: `${when}. Until then you may be paying rent and EMI together${taxed.length ? `, and an under-construction home carries GST: about ${list(taxed.map((h) => `${inr(gstOn(h))} on ${h.title}`))}` : ''}. A ready home carries no GST.` });
  }

  // 6. Priced well away from its own area.
  for (const h of hs) {
    const gap = vsArea(h);
    if (gap != null && gap >= 15) out.push({ key: `above-${h.slug}`, tone: 'warn', icon: '📈', slugs: [h.slug], title: `${h.title} asks ${gap}% above its area`, text: `Homes listed in ${h.locality.name} average ${rupees(h.areaRate!)} a sq ft; this one asks ${rupees(perSqft(h))}. Ask what justifies it (floor, view, fittings) and use it when you negotiate.` });
    else if (gap != null && gap <= -15) out.push({ key: `below-${h.slug}`, tone: 'info', icon: '📉', slugs: [h.slug], title: `${h.title} asks ${Math.abs(gap)}% below its area`, text: `Homes listed in ${h.locality.name} average ${rupees(h.areaRate!)} a sq ft; this one asks ${rupees(perSqft(h))}. It may be good value, or there may be a reason: ask about its age, floor and papers.` });
  }

  // 7. Different areas or sizes: say so, so price alone is not compared.
  const places = [...new Set(hs.map((h) => h.locality.name))]; const sizes = [...new Set(hs.map((h) => h.bhk))].sort();
  if (places.length > 1) out.push({ key: 'place', tone: 'info', icon: '📍', slugs: [], title: 'They are in different areas', text: `${list(places)}. The area changes your commute and resale more than the flat does, so settle that first.` });
  if (sizes.length > 1 && !sizes.includes(0)) out.push({ key: 'sizes', tone: 'info', icon: '🛏️', slugs: [], title: 'They are not the same size of home', text: `${list(hs.map((h) => `${h.title} is a ${h.bhk} BHK`))}. Compare the rate per sq ft, not the price.` });

  // 8. What only one of them has.
  const only = hs.map((h) => ({ h, extra: h.amenities.filter((a) => hs.every((o) => o === h || !o.amenities.includes(a))) })).filter((x) => x.extra.length);
  if (only.length) out.push({ key: 'amenities', tone: 'info', icon: '🏊', slugs: only.map((x) => x.h.slug), title: 'Amenities the others do not list', text: `${only.map((x) => `${x.h.title}: ${x.extra.slice(0, 4).join(', ')}`).join('. ')}. A missing amenity may simply not have been listed; confirm on a visit.` });
  const furnished = hs.filter((h) => /^(fully|semi)/i.test(h.furnishing ?? ''));
  if (furnished.length && furnished.length < hs.length) out.push({ key: 'furnishing', tone: 'info', icon: '🛋️', slugs: furnished.map((h) => h.slug), title: `${list(furnished.map((h) => h.title))} ${furnished.length === 1 ? 'comes' : 'come'} furnished`, text: `${furnished.map((h) => `${h.title} is ${h.furnishing!.toLowerCase()}`).join('; ')}. Set aside money for fittings and furniture in the others.` });
  return out;
}

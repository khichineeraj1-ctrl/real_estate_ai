import type { Check, Insight, Scorecard, Track } from './insights';

/**
 * What a buyer choosing between two localities should notice, from facts we hold: homes listed with us (prices,
 * sizes), the projects on the RERA registers there and where each stands, and where the two places are.
 * Where there are no listings there are no prices, and the insight says so instead of guessing.
 */
export interface Area {
  slug: string; name: string; city: string;
  homes: number; avgRate: number | null; minPrice: number | null; maxPrice: number | null; sizes: number[];
  /** Every registered project in the locality, by where its registration stands. */
  projects: Track; builders: number; withAgents: number;
  highlights: string[]; lat: number; lng: number;
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const inr = (n: number) => (n >= 1e7 ? `₹${+(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${+(n / 1e5).toFixed(1)} L` : rupees(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Straight-line distance in km, to one decimal. */
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180; const dLat = (b.lat - a.lat) * rad; const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function areaScorecard(a: Area, other: Area): Scorecard {
  const t = a.projects;
  const rate: Check = a.avgRate != null ? { label: 'Asking rate', tone: other.avgRate != null && a.avgRate < other.avgRate ? 'good' : 'info', text: `${rupees(a.avgRate)} a sq ft` } : { label: 'Asking rate', tone: 'none', text: 'No homes listed yet' };
  const homes: Check = a.homes ? { label: 'Homes for sale', tone: 'good', text: `${a.homes}, from ${inr(a.minPrice!)}` } : { label: 'Homes for sale', tone: 'none', text: 'None listed yet' };
  const reg: Check = t.total ? { label: 'Registered projects', tone: 'info', text: `${t.total} by ${plural(a.builders, 'builder')}` } : { label: 'Registered projects', tone: 'none', text: 'None on the registers we read' };
  const building: Check = t.current ? { label: 'Being built now', tone: 'good', text: plural(t.current, 'project') } : { label: 'Being built now', tone: 'none', text: t.total ? 'None with a running registration' : 'Not known' };
  const lapsed: Check = !t.total ? { label: 'Lapsed registrations', tone: 'none', text: 'Not known' } : t.lapsed ? { label: 'Lapsed registrations', tone: 'warn', text: `${t.lapsed} of ${t.total} projects` } : { label: 'Lapsed registrations', tone: 'good', text: 'None' };
  const tag = a.avgRate != null && other.avgRate != null && a.avgRate !== other.avgRate
    ? (a.avgRate < other.avgRate ? { tone: 'good' as const, text: 'Lower asking rate' } : { tone: 'info' as const, text: 'Higher asking rate' })
    : t.current !== other.projects.current ? (t.current > other.projects.current ? { tone: 'good' as const, text: 'More being built' } : { tone: 'info' as const, text: 'Fewer new projects' })
    : { tone: 'info' as const, text: t.total ? plural(t.total, 'registered project') : 'Few facts on record' };
  return { slug: a.slug, tag, checks: [rate, homes, reg, building, lapsed] };
}

export function localityInsights(a: Area, b: Area): Insight[] {
  const out: Insight[] = [];
  const both = [a, b];

  // 1. Price, only from homes actually listed.
  if (a.avgRate != null && b.avgRate != null) {
    if (a.avgRate === b.avgRate) out.push({ key: 'price', tone: 'info', icon: '💰', slugs: [], title: 'They ask about the same', text: `Homes in both ask about ${rupees(a.avgRate)} a sq ft, so price will not decide this for you.` });
    else {
      const [lo, hi] = a.avgRate < b.avgRate ? [a, b] : [b, a];
      const gap = Math.round(((hi.avgRate! - lo.avgRate!) / hi.avgRate!) * 100);
      out.push({ key: 'price', tone: 'good', icon: '💰', slugs: [lo.slug], title: `${lo.name} is ${gap}% cheaper`, text: `Homes there ask ${rupees(lo.avgRate!)} a sq ft against ${rupees(hi.avgRate!)} in ${hi.name}. On a 1,500 sq ft home that is about ${inr((hi.avgRate! - lo.avgRate!) * 1500)} less, before stamp duty.` });
    }
  } else if (a.avgRate != null || b.avgRate != null) {
    const [has, not] = a.avgRate != null ? [a, b] : [b, a];
    out.push({ key: 'price', tone: 'info', icon: '💰', slugs: [has.slug], title: `Only ${has.name} has prices to go on`, text: `Homes listed there ask ${rupees(has.avgRate!)} a sq ft, from ${inr(has.minPrice!)}. Nobody has listed a home in ${not.name} with us yet, so we will not guess its rate.` });
  } else {
    out.push({ key: 'price', tone: 'info', icon: '💰', slugs: [], title: 'No prices for either yet', text: `No owner, agent or builder has listed a home in ${a.name} or ${b.name} with us, and RERA registers carry no prices. Ask for a call back on a project in each and compare the quotes.` });
  }

  // 2. How much there is to choose from today.
  if (a.homes !== b.homes && (a.homes || b.homes)) {
    const [more, less] = a.homes > b.homes ? [a, b] : [b, a];
    out.push({ key: 'choice', tone: 'info', icon: '🏠', slugs: [more.slug], title: `${more.name} has more homes listed`, text: `${plural(more.homes, 'home')} against ${less.homes ? plural(less.homes, 'home') : 'none'} in ${less.name}. More listings means more room to compare and to bargain.` });
  }

  // 3. How big each market is, and what is being built: projects whose registration is still running.
  const ca = a.projects.current; const cb = b.projects.current;
  const [big, small] = a.projects.total >= b.projects.total ? [a, b] : [b, a];
  if (small.projects.total > 0 && big.projects.total >= 3 * small.projects.total && big.projects.total >= 6) {
    out.push({ key: 'size', tone: 'info', icon: '🏗️', slugs: [big.slug], title: `${big.name} is the much bigger market`, text: `${big.projects.total} registered projects by ${plural(big.builders, 'builder')}, ${big.projects.current} of them still being built, against ${small.projects.total} by ${plural(small.builders, 'builder')} (${small.projects.current} being built) in ${small.name}. More choice and more competition between builders, and more construction around you for a few years.` });
  } else if (ca !== cb && Math.max(ca, cb) >= 2) {
    const [more, less] = ca > cb ? [a, b] : [b, a];
    out.push({ key: 'building', tone: 'info', icon: '🏗️', slugs: [more.slug], title: `More is being built in ${more.name}`, text: `${plural(more.projects.current, 'project')} there ${more.projects.current === 1 ? 'has' : 'have'} a running RERA registration, against ${less.projects.current || 'none'} in ${less.name}. That means more new homes to choose from, and more construction around you for a few years.` });
  }

  // 4. The share of projects past the builder's completion date: likely finished stock. Shares, so a bigger area does not win by size.
  const share = (x: Area) => (x.projects.total >= 4 ? x.projects.ended / x.projects.total : null);
  const sa = share(a); const sb = share(b);
  if (sa != null && sb != null && Math.abs(sa - sb) >= 0.15) {
    const [more, less] = sa > sb ? [a, b] : [b, a];
    const pct = (x: Area) => Math.round((x.projects.ended / x.projects.total) * 100);
    out.push({ key: 'finished', tone: 'info', icon: '🏁', slugs: [more.slug], title: `${more.name} looks more settled`, text: `${pct(more)}% of its projects are past the completion date the builder gave RERA, against ${pct(less)}% in ${less.name}. Past that date a building is often finished, so more of ${more.name} may be ready to move into; ask for the occupation certificate.` });
  }

  // 5. Lapsed registrations: a reason to check the project, not to avoid the area.
  const flagged = both.filter((x) => x.projects.lapsed >= 2 || (x.projects.lapsed === 1 && x.projects.total <= 4));
  if (flagged.length) {
    const count = (x: Area) => `${x.projects.lapsed} of ${x.projects.total} in ${x.name}`;
    out.push({
      key: 'lapsed', tone: 'warn', icon: '⚠️', slugs: flagged.map((x) => x.slug),
      title: flagged.length === 2 ? 'Some projects in both are marked lapsed' : `${flagged[0].projects.lapsed} of ${flagged[0].projects.total} projects in ${flagged[0].name} ${flagged[0].projects.lapsed === 1 ? 'is' : 'are'} marked lapsed`,
      text: `${flagged.length === 2 ? `${count(a)} and ${count(b)}. ` : ''}The RERA register shows no valid registration for them today. That says nothing against the area, but check the registration of any project you shortlist before paying.`,
    });
  }

  // 6. Sizes on offer, where homes are listed on both sides.
  if (a.sizes.length && b.sizes.length) {
    const onlyA = a.sizes.filter((n) => !b.sizes.includes(n)); const onlyB = b.sizes.filter((n) => !a.sizes.includes(n));
    if (onlyA.length || onlyB.length) {
      const say = (x: Area, ns: number[]) => `${ns.map((n) => `${n} BHK`).join(' and ')} only in ${x.name}`;
      out.push({ key: 'sizes', tone: 'info', icon: '📐', slugs: [], title: 'They do not offer the same sizes', text: `${[onlyA.length ? say(a, onlyA) : '', onlyB.length ? say(b, onlyB) : ''].filter(Boolean).join('; ')}, among homes listed with us.` });
    }
  }

  // 7. Where they are.
  const d = km(a, b);
  const known = both.filter((x) => x.highlights[0]).map((x) => `${x.name}: ${x.highlights.slice(0, 2).join('; ')}`).join('. ');
  out.push({ key: 'place', tone: 'info', icon: '📍', slugs: [], title: d < 1 ? 'They are next to each other' : `About ${d} km apart, in a straight line`, text: `${known ? `${known}. ` : ''}${d >= 8 ? 'That is far enough to change your commute, so decide by where you work and where the children study.' : 'They are close enough that the commute is similar; visit both at rush hour.'}` });

  // 8. Who you can talk to.
  if (a.withAgents !== b.withAgents) {
    const [more] = a.withAgents > b.withAgents ? [a, b] : [b, a];
    out.push({ key: 'agents', tone: 'good', icon: '🛡️', slugs: [more.slug], title: `Verified agents sell in ${more.name}`, text: `${plural(more.withAgents, 'project')} there ${more.withAgents === 1 ? 'has' : 'have'} an agent whose identity and RERA registration we have checked.` });
  }
  return out;
}

/**
 * What a buyer comparing builder projects should notice, worked out only from facts we hold: the RERA register's own
 * status and dates, the builder's other registrations in the city, the locality, and whatever sellers have listed.
 * Nothing here is a forecast or a rating; where a fact is missing the insight says so, or is left out.
 */
export type Standing = 'current' | 'ended' | 'lapsed' | 'unknown';
export type Tone = 'good' | 'warn' | 'info';
/** The builder's other registered projects in the same city (this project left out), by where each stands. */
export interface Track { total: number; current: number; ended: number; lapsed: number }
export interface Facts {
  slug: string; name: string;
  builder: { slug: string | null; name: string };
  locality: { slug: string; name: string }; city: { slug: string; name: string };
  registerStatus: string | null; registerValidUntil: Date | string | null; reraId: string | null;
  track: Track;
  homes: number; minPrice: number | null; maxPrice: number | null;
  localityRate: number | null; highlights: string[];
  agents: number;
}
export interface Insight { key: string; tone: Tone; icon: string; title: string; text: string; slugs: string[] }
export interface Check { label: string; tone: Tone | 'none'; text: string }
export interface Scorecard { slug: string; tag: { tone: Tone; text: string }; checks: Check[] }

const MONTH = 30.44 * 24 * 3600 * 1000;
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const monthYear = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const inr = (n: number) => (n >= 1e7 ? `₹${+(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${+(n / 1e5).toFixed(1)} L` : `₹${n.toLocaleString('en-IN')}`);
const until = (p: Facts) => (p.registerValidUntil ? new Date(p.registerValidUntil) : null);

/** Where a registration stands today, from the register's own status and end date. */
export function standingOf(p: { registerStatus: string | null; registerValidUntil: Date | string | null }, now = new Date()): Standing {
  if (/lapsed/i.test(p.registerStatus ?? '')) return 'lapsed';
  if (!p.registerValidUntil) return 'unknown';
  return new Date(p.registerValidUntil) < now ? 'ended' : 'current';
}

/** The year the register entry was made, where the number carries it (Haryana: "… DATED 09.10.2020"). */
export function registeredYear(reraId: string | null): number | null {
  const m = /DATED\s+\d{1,2}[./-]\d{1,2}[./-](\d{4})/i.exec(reraId ?? '');
  return m ? Number(m[1]) : null;
}

/** The day the register entry was made, where the number carries it ("… DATED 09.10.2020"); null otherwise. */
export function registeredOn(reraId: string | null): Date | null {
  const m = /DATED\s+(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i.exec(reraId ?? '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return d.getUTCMonth() === +m[2] - 1 && +m[3] >= 2016 ? d : null;
}

/** "3 years 4 months", "7 months", "under a month". */
export function span(ms: number): string {
  const months = Math.round(Math.abs(ms) / MONTH);
  if (months < 1) return 'under a month';
  const y = Math.floor(months / 12); const m = months % 12;
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
}

export function scorecard(p: Facts, now = new Date()): Scorecard {
  const st = standingOf(p, now); const end = until(p);
  const rera: Check = st === 'current' ? { label: 'RERA registration', tone: 'good', text: 'Current' }
    : st === 'lapsed' ? { label: 'RERA registration', tone: 'warn', text: 'Marked lapsed' }
    : st === 'ended' ? { label: 'RERA registration', tone: 'info', text: 'Period over' }
    : { label: 'RERA registration', tone: 'none', text: p.reraId ? 'Registered, no end date' : 'Not on a register we read' };
  const date: Check = !end || st === 'lapsed' && !end ? { label: 'Builder’s completion date', tone: 'none', text: 'Not known' }
    : end < now ? { label: 'Builder’s completion date', tone: st === 'lapsed' ? 'warn' : 'info', text: `${monthYear(end)}, ${span(now.getTime() - end.getTime())} ago` }
    : { label: 'Builder’s completion date', tone: 'good', text: `${monthYear(end)}, in ${span(end.getTime() - now.getTime())}` };
  const t = p.track;
  const record: Check = t.total < 1 ? { label: `Builder in ${p.city.name}`, tone: 'none', text: 'Its only project here' }
    : t.lapsed ? { label: `Builder in ${p.city.name}`, tone: 'warn', text: `${t.lapsed} of ${t.total} other project${t.total === 1 ? '' : 's'} lapsed` }
    : { label: `Builder in ${p.city.name}`, tone: 'good', text: `${t.total} other project${t.total === 1 ? '' : 's'}, none lapsed` };
  const priced: Check = p.minPrice != null ? { label: 'Price', tone: 'good', text: p.maxPrice && p.maxPrice !== p.minPrice ? `${inr(p.minPrice)} to ${inr(p.maxPrice)}` : `From ${inr(p.minPrice)}` } : { label: 'Price', tone: 'none', text: 'Not listed yet' };
  const agent: Check = p.agents ? { label: 'Verified agent', tone: 'good', text: p.agents === 1 ? '1 selling this' : `${p.agents} selling this` } : { label: 'Verified agent', tone: 'none', text: 'None yet' };
  const tag = st === 'lapsed' ? { tone: 'warn' as const, text: 'Check before paying' }
    : st === 'current' ? { tone: 'good' as const, text: 'Registration current' }
    : st === 'ended' ? { tone: 'info' as const, text: 'Past its completion date' }
    : { tone: 'info' as const, text: 'Few facts on record' };
  return { slug: p.slug, tag, checks: [rera, date, record, priced, agent] };
}

export function compareInsights(ps: Facts[], now = new Date()): Insight[] {
  if (ps.length < 2) return [];
  const out: Insight[] = [];
  const st = ps.map((p) => standingOf(p, now));
  const of = (k: Standing) => ps.filter((_, i) => st[i] === k);
  const lapsed = of('lapsed'); const current = of('current'); const ended = of('ended');
  const are = (xs: unknown[]) => (xs.length === 1 ? 'is' : 'are');

  // 1. The one thing that should stop a buyer.
  if (lapsed.length) {
    out.push({
      key: 'lapsed', tone: 'warn', icon: '⚠️', slugs: lapsed.map((p) => p.slug),
      title: lapsed.length === ps.length ? 'Every one of these is marked lapsed' : `${list(lapsed.map((p) => p.name))} ${are(lapsed)} marked lapsed`,
      text: `The RERA register shows no valid registration for ${lapsed.length === 1 ? 'it' : 'them'} today. Ask the builder for the extension order before paying anything${current.length ? `; ${list(current.map((p) => p.name))} ${current.length === 1 ? 'has' : 'have'} a registration that is still running` : ''}.`,
    });
  }

  // 2. When each is due. A registration runs to the date the builder gave RERA for finishing the project.
  const dated = current.filter((p) => until(p)).sort((a, b) => until(a)!.getTime() - until(b)!.getTime());
  if (dated.length > 1 && until(dated[dated.length - 1])!.getTime() - until(dated[0])!.getTime() > 2 * MONTH) {
    const first = dated[0]; const last = dated[dated.length - 1];
    out.push({
      key: 'sooner', tone: 'info', icon: '📅', slugs: [first.slug],
      title: `${first.name} is due sooner`,
      text: `Its registration runs to ${monthYear(until(first)!)}, ${span(until(last)!.getTime() - until(first)!.getTime())} before ${last.name} (${monthYear(until(last)!)}). That end date is what the builder told RERA for finishing the project; possession can still slip.`,
    });
  }
  if (ended.length && (current.length || ended.length > 1 || lapsed.length)) {
    out.push({
      key: 'ended', tone: 'info', icon: '🏁', slugs: ended.map((p) => p.slug),
      title: `${list(ended.map((p) => p.name))} ${are(ended)} past the builder’s completion date`,
      text: `${ended.map((p) => `${p.name} was due by ${monthYear(until(p)!)}`).join('; ')}. That often means the building is finished and may be ready to move into: ask for the occupation certificate to be sure.${current.length ? ` ${list(current.map((p) => p.name))} ${are(current)} still being built on paper.` : ''}`,
    });
  }

  // 3. The builder: its projects in the city apart from the ones on this page, which are already described above.
  const id = (p: Facts) => p.builder.slug ?? p.builder.name;
  const builders = [...new Map(ps.map((p) => [id(p), p])).values()].map((p) => {
    const mine = ps.filter((x) => id(x) === id(p)); const siblings = mine.filter((x) => x !== p);
    const lapsedSiblings = siblings.filter((x) => standingOf(x, now) === 'lapsed').length;
    return { ...p, mine, all: p.track.total + 1, track: { ...p.track, total: p.track.total - siblings.length, lapsed: p.track.lapsed - lapsedSiblings } };
  });
  const cities = new Set(ps.map((p) => p.city.slug));
  if (builders.length === 1) {
    const b = builders[0];
    out.push({
      key: 'same-builder', tone: b.track.lapsed ? 'warn' : 'info', icon: '🏗️', slugs: [],
      title: `Same builder: ${b.builder.name}`,
      text: `So the builder is not what separates these; the project, its dates and its place are.${b.track.total > 0 ? ` ${b.builder.name} has ${b.track.total} other registered project${b.track.total === 1 ? '' : 's'} in ${b.city.name}${b.track.lapsed ? `, ${b.track.lapsed} of them marked lapsed` : ', none marked lapsed'}.` : ''}`,
    });
  } else {
    const flagged = builders.filter((b) => b.track.lapsed > 0);
    for (const b of flagged) {
      out.push({
        key: `record-${b.builder.slug ?? b.slug}`, tone: 'warn', icon: '🏗️', slugs: b.mine.map((p) => p.slug),
        title: `${b.builder.name}: ${b.track.lapsed} of its ${b.track.total} other projects in ${b.city.name} lapsed`,
        text: `That is from the RERA register, and does not count the project${b.mine.length === 1 ? '' : 's'} compared here. Ask ${b.builder.name} what happened there before choosing ${list(b.mine.map((p) => p.name))}.`,
      });
    }
    const top = [...builders].sort((a, b) => b.all - a.all);
    if (cities.size === 1 && top[0].all >= 3 && top[0].all >= 2 * top[1].all) {
      out.push({
        key: 'established', tone: 'info', icon: '🏢', slugs: top[0].mine.map((p) => p.slug),
        title: `${top[0].builder.name} has more projects here`,
        text: `${top.map((b) => `${b.builder.name} has ${b.all} registered project${b.all === 1 ? '' : 's'} in ${b.city.name}`).join('; ')}. More projects means more past buyers you can ask, not that a project is better.`,
      });
    }
  }

  // 4. Price. The registers carry none, so this speaks only where a seller has listed homes.
  const priced = ps.filter((p) => p.minPrice != null).sort((a, b) => a.minPrice! - b.minPrice!);
  if (priced.length > 1 && priced[0].minPrice !== priced[priced.length - 1].minPrice) {
    const lo = priced[0]; const hi = priced[priced.length - 1];
    out.push({ key: 'price', tone: 'info', icon: '💰', slugs: [lo.slug], title: `${lo.name} starts lower`, text: `Homes listed there start at ${inr(lo.minPrice!)}, against ${inr(hi.minPrice!)} at ${hi.name}. Compare sizes before prices: a lower start can simply be a smaller home.` });
  } else if (priced.length === 1) {
    out.push({ key: 'price', tone: 'info', icon: '💰', slugs: [priced[0].slug], title: `Only ${priced[0].name} has prices listed`, text: `Homes there start at ${inr(priced[0].minPrice!)}. For ${list(ps.filter((p) => p.minPrice == null).map((p) => p.name))}, ask for a call back and we will get the price for you.` });
  } else if (!priced.length) {
    out.push({ key: 'price', tone: 'info', icon: '💰', slugs: [], title: 'No prices listed for these yet', text: 'RERA registers carry no prices, and no seller has listed homes in these projects. Ask for a call back on each and compare the quotes for the same size of home.' });
  }

  // 5. Where they are.
  const places = [...new Map(ps.map((p) => [`${p.city.slug}/${p.locality.slug}`, p])).values()];
  if (places.length === 1) {
    out.push({ key: 'place', tone: 'info', icon: '📍', slugs: [], title: `Same area: ${places[0].locality.name}`, text: `Commute, schools and resale demand will be much the same${places[0].highlights[0] ? ` (${places[0].highlights.slice(0, 2).join('; ')})` : ''}. Visit both sites: the road in and what is next door differ plot by plot.` });
  } else {
    const rated = places.filter((p) => p.localityRate != null).sort((a, b) => a.localityRate! - b.localityRate!);
    out.push({
      key: 'place', tone: 'info', icon: '📍', slugs: [],
      title: rated.length === places.length && rated.length > 1 ? `${rated[0].locality.name} is the cheaper area` : 'They are in different areas',
      text: rated.length === places.length && rated.length > 1
        ? `${rated.map((p) => `${p.locality.name} asks about ₹${p.localityRate!.toLocaleString('en-IN')} a sq ft`).join('; ')}, going by homes listed with us.`
        : `${places.map((p) => `${p.locality.name}${p.highlights[0] ? `: ${p.highlights[0]}` : ''}`).join('. ')}. Decide the area first; it changes your commute more than the project does.`,
    });
  }

  // 6. Who you can talk to.
  const withAgent = ps.filter((p) => p.agents > 0);
  if (withAgent.length && withAgent.length < ps.length) {
    out.push({ key: 'agent', tone: 'good', icon: '🛡️', slugs: withAgent.map((p) => p.slug), title: `${list(withAgent.map((p) => p.name))} ${withAgent.length === 1 ? 'has' : 'have'} an agent we have verified`, text: 'You can be put through to someone whose identity and RERA agent registration we have checked. For the others, our own team calls you back.' });
  }

  // 7. How old the launch is.
  const years = ps.map((p) => ({ p, y: registeredYear(p.reraId) })).filter((x): x is { p: Facts; y: number } => x.y != null).sort((a, b) => b.y - a.y);
  if (years.length === ps.length && years[0].y - years[years.length - 1].y >= 2) {
    out.push({ key: 'newer', tone: 'info', icon: '🆕', slugs: [years[0].p.slug], title: `${years[0].p.name} is the newer launch`, text: `It was registered in ${years[0].y}; ${years[years.length - 1].p.name} in ${years[years.length - 1].y}. A newer launch usually has more homes to choose from; an older one is closer to being lived in.` });
  }
  return out;
}

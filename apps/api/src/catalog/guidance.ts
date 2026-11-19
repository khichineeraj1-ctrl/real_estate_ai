import { registeredYear, span, standingOf, type Tone } from './insights';

/**
 * Two things worked out for buyers from the RERA registers: a builder's track record across its registered projects,
 * and what to check before paying for a particular project. Both state facts and what to ask; neither is a rating.
 */
export interface RegisterRow { name: string; registerStatus: string | null; registerValidUntil: Date | string | null; reraId: string | null }
export interface BuilderRecord {
  total: number; current: number; ended: number; lapsed: number; unknown: number;
  /** The years of the earliest and latest registrations we can read a year from. */
  since: number | null; latest: number | null;
  /** The running registration that ends soonest: the next project due. */
  nextDue: { name: string; date: string } | null;
  lapsedNames: string[];
  verdict: { tone: Tone | 'none'; title: string; text: string };
}

const monthYear = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function builderRecord(name: string, place: string, rows: RegisterRow[], now = new Date()): BuilderRecord {
  const count = { current: 0, ended: 0, lapsed: 0, unknown: 0 };
  for (const r of rows) count[standingOf(r, now)] += 1;
  const years = rows.map((r) => registeredYear(r.reraId)).filter((y): y is number => y != null);
  const due = rows.filter((r) => standingOf(r, now) === 'current').sort((a, b) => new Date(a.registerValidUntil!).getTime() - new Date(b.registerValidUntil!).getTime())[0];
  const lapsedNames = rows.filter((r) => standingOf(r, now) === 'lapsed').map((r) => r.name);
  const total = rows.length; const share = total ? count.lapsed / total : 0;
  const verdict: BuilderRecord['verdict'] = total === 0 ? { tone: 'none', title: 'No registrations on record', text: `We hold no RERA registrations for ${name} in ${place}.` }
    : count.lapsed === 0
      ? { tone: 'good', title: 'No lapsed registrations', text: `None of ${name}’s ${plural(total, 'registered project')} in ${place} is marked lapsed by the register. ${count.ended ? `${plural(count.ended, 'is', 'are')} past the completion date the builder gave RERA, which usually means built.` : 'All are still within their registered period.'}` }
      : share >= 0.25 || count.lapsed >= 5
        ? { tone: 'warn', title: `${count.lapsed} of ${total} registrations lapsed`, text: `A large share of ${name}’s projects in ${place} have no valid registration today. Ask about each lapsed project, and for the extension order, before paying for any of them.` }
        : { tone: 'warn', title: `${count.lapsed} of ${total} registrations lapsed`, text: `Most of ${name}’s projects in ${place} are in order, but ${plural(count.lapsed, 'is', 'are')} marked lapsed. If the project you want is one of them, ask for the extension order before paying.` };
  return { total, ...count, since: years.length ? Math.min(...years) : null, latest: years.length ? Math.max(...years) : null, nextDue: due ? { name: due.name, date: new Date(due.registerValidUntil!).toISOString() } : null, lapsedNames: lapsedNames.slice(0, 12), verdict };
}

export interface ProjectFacts {
  name: string; builder: string; city: string;
  registerStatus: string | null; registerValidUntil: Date | string | null; reraId: string | null; sourceUrl: string | null; registerName: string | null;
  /** The builder's other projects in the city marked lapsed, and how many others there are. */
  othersLapsed: number; others: number;
  priced: boolean; agents: number;
  /** What the builder declared about pending litigation in its registration application; null when not read. */
  litigation?: boolean | null;
}
export interface CheckItem { key: string; tone: Tone; title: string; why: string; link?: { href: string; label: string } }

/** What to check, ask for and refuse before paying for this project, most pressing first. */
export function beforeYouPay(p: ProjectFacts, now = new Date()): CheckItem[] {
  const st = standingOf(p, now); const end = p.registerValidUntil ? new Date(p.registerValidUntil) : null;
  const items: CheckItem[] = [];
  const register = p.sourceUrl ? { href: p.sourceUrl, label: `Open the ${p.registerName ?? 'RERA'} page` } : undefined;

  if (st === 'lapsed') items.push({ key: 'lapsed', tone: 'warn', title: 'Ask for the registration extension order', why: `The register marks ${p.name}’s registration as lapsed. Without a valid registration a builder may not sell. Do not pay until you have seen the extension order.`, link: register });
  else if (st === 'current') items.push({ key: 'rera', tone: 'good', title: 'Confirm the RERA number yourself', why: `${p.reraId ? `It is ${p.reraId}. ` : ''}The registration is running${end ? ` to ${monthYear(end)}` : ''}. Check that the number on your agreement matches the register.`, link: register });
  else if (st === 'ended') items.push({ key: 'oc', tone: 'info', title: 'Ask for the occupation certificate', why: `The completion date the builder gave RERA${end ? ` (${monthYear(end)}, ${span(now.getTime() - end.getTime())} ago)` : ''} has passed. If the building is finished it should have an occupation certificate; without one you cannot legally move in.`, link: register });
  else items.push({ key: 'rera', tone: 'warn', title: 'Ask for the RERA registration number', why: 'We could not read a registration period for this project. Any project above 500 sq m or eight flats must be registered; ask for the number and check it on the state register.', link: register });

  if (p.litigation === true) items.push({ key: 'litigation', tone: 'warn', title: 'Ask about the litigation the builder declared', why: `In its registration application ${p.builder} declared that litigation is pending against this project. Ask what the case is about and have your lawyer read the papers before paying.`, link: register });
  if (p.othersLapsed > 0) items.push({ key: 'record', tone: 'warn', title: `Ask about ${p.builder}’s lapsed projects`, why: `${p.othersLapsed} of its ${p.others} other projects in ${p.city} are marked lapsed by the register. Ask what happened there and whether buyers got possession.` });

  if (st === 'current' && end) items.push({ key: 'date', tone: 'info', title: 'Get the possession date in writing', why: `The builder told RERA it will finish by ${monthYear(end)}. Your agreement should name a possession date no later than that, and the interest the builder pays you for each month of delay.`, link: { href: '/tools/delay-cost', label: 'What a delay would cost you' } });

  items.push({ key: 'carpet', tone: 'info', title: 'Ask for the carpet area, in sq ft', why: 'RERA requires homes to be sold on carpet area: the floor you can actually use. A price quoted on “super built-up” area can hide 25% to 40% of space you never get.', link: { href: '/tools/true-price', label: 'Work out the price per carpet sq ft' } });
  items.push({ key: 'costs', tone: 'info', title: 'Get the full cost sheet before you book', why: `${p.priced ? '' : 'The register carries no prices. '}Ask for every charge on one sheet: parking, club membership, preferred-location and floor-rise charges, maintenance deposit, GST, stamp duty and registration.`, link: { href: '/tools/true-price', label: 'Add up the whole bill' } });
  items.push({ key: 'ten', tone: 'info', title: 'Pay no more than 10% before the agreement', why: 'Under RERA a builder may not take more than 10% of the price before a written agreement for sale is signed and registered. Treat a request for more as a warning.' });
  items.push({ key: 'account', tone: 'info', title: 'Pay only into the project’s own account', why: 'Pay by cheque or bank transfer to the project account named in the agreement, never in cash or to a person. Builders must keep 70% of buyers’ money in a separate account for that project.' });
  items.push({ key: 'title', tone: 'info', title: 'Have a lawyer read the title and approvals', why: 'Ask for the land title, the sanctioned building plan and the commencement certificate, and have them read by a lawyer you chose, not one the seller suggests.' });
  items.push({ key: 'loan', tone: 'info', title: 'Ask which banks have approved the project', why: 'A bank lends on a project only after its own legal check. If no large bank will, ask why before going further.' });
  if (p.agents > 0) items.push({ key: 'agent', tone: 'good', title: 'Deal through a verified agent', why: `${plural(p.agents, 'agent')} whose identity and RERA registration we have checked ${p.agents === 1 ? 'sells' : 'sell'} this project. Ask any other agent for their RERA agent number.` });
  return items;
}

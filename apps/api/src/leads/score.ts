/**
 * How likely a buyer who enquired is to go ahead, as a score from 0 to 100 with the reasons for it.
 *
 * Three things are weighed, most to least:
 *   1. What the buyer told us (up to 55): when they mean to buy, a site visit, how they will pay, their budget.
 *   2. What they did on the site before enquiring (up to 30): came back, used a calculator, compared, looked around.
 *   3. How they got in touch (up to 15): gave an email, wrote a message, asked about this project before.
 * Signs that the enquiry is not from a real buyer take points away.
 *
 * A pure function: the same answers always give the same score, and every point is explained, so sales teams can see
 * why a lead is marked hot and tell us when the weights are wrong. The weights are our starting judgement; they should
 * be checked against which leads actually visit and book once there is enough history.
 */

export const TIMELINES = { NOW: 'Within a month', SOON: 'In 1 to 3 months', LATER: 'In 3 to 6 months', EXPLORING: 'Just exploring' } as const;
export const BUDGETS = { U50L: 'Under ₹50 lakh', '50L_1CR': '₹50 lakh to ₹1 crore', '1_2CR': '₹1 to 2 crore', '2_5CR': '₹2 to 5 crore', '5CR_PLUS': 'Above ₹5 crore' } as const;
export const LOANS = { APPROVED: 'Home loan already approved', NEEDED: 'Will need a home loan', NONE: 'Paying without a loan' } as const;
export const PURPOSES = { SELF: 'To live in', INVEST: 'As an investment' } as const;

export type Timeline = keyof typeof TIMELINES;
export type Budget = keyof typeof BUDGETS;
export type Loan = keyof typeof LOANS;
export type Purpose = keyof typeof PURPOSES;

/** What the buyer's browser noted about their use of the site. Counts only; no page contents and nothing typed. */
export interface Signals {
  /** Times this project or home's page was opened, today's included. */
  views: number;
  /** Different days on which the buyer used the site. */
  days: number;
  /** Seconds the page was open before the form was sent. */
  seconds: number;
  /** Other project, builder and locality pages opened. */
  pages: number;
  /** Calculators used: any of emi, afford, cost. */
  tools: string[];
  /** Homes or localities put side by side. */
  compared: number;
  /** Questions put to the assistant. */
  asked: number;
}

export interface LeadFacts {
  name: string; phone: string; email: string | null; message: string | null;
  timeline: Timeline | null; budget: Budget | null; loan: Loan | null; purpose: Purpose | null; wantsVisit: boolean;
  signals: Signals | null;
  /** Earlier enquiries from this phone number about the same project or home. */
  earlierHere: number;
  /** Enquiries from this phone number, about anything, in the last day (not counting this one). */
  lastDay: number;
}

export type Band = 'HOT' | 'WARM' | 'COLD';
export interface Reason { points: number; text: string }
export interface LeadScore { score: number; band: Band; reasons: Reason[] }

export const BAND_LABEL: Record<Band, string> = { HOT: 'Hot', WARM: 'Warm', COLD: 'Cold' };
/** Hot: call today. Warm: worth a call this week. Cold: little sign of intent yet. */
export const bandOf = (score: number): Band => (score >= 50 ? 'HOT' : score >= 25 ? 'WARM' : 'COLD');

const ASKS = /\b(visit|site visit|see (it|the)|price|cost|quote|negotia|book|token|loan|emi|possession|floor plan|available|availability|this (week|weekend|month)|tomorrow|today)\b/i;
/** Numbers nobody owns: one digit repeated, or a run such as 1234567890. */
const junkPhone = (phone: string) => { const d = phone.replace(/\D/g, '').slice(-10); return /^(\d)\1{9}$/.test(d) || d === '1234567890' || d === '0123456789' || d === '9876543210'; };
const junkName = (name: string) => { const n = name.trim().toLowerCase(); return n.replace(/[^a-z]/g, '').length < 2 || /^(test|testing|asdf|abc|xyz|na|none|n\/a)\b/.test(n); };

export function scoreLead(f: LeadFacts): LeadScore {
  const reasons: Reason[] = [];
  const add = (points: number, text: string) => { if (points) reasons.push({ points, text }); };

  // 1. What the buyer told us
  if (f.timeline === 'NOW') add(25, 'Plans to buy within a month');
  else if (f.timeline === 'SOON') add(18, 'Plans to buy in 1 to 3 months');
  else if (f.timeline === 'LATER') add(10, 'Plans to buy in 3 to 6 months');
  else if (f.timeline === 'EXPLORING') add(2, 'Says they are just exploring');
  else add(5, 'Did not say when they plan to buy');
  if (f.wantsVisit) add(12, 'Asked for a site visit');
  if (f.loan === 'APPROVED') add(10, 'Home loan already approved');
  else if (f.loan === 'NONE') add(8, 'Paying without a loan');
  else if (f.loan === 'NEEDED') add(5, 'Will need a home loan');
  if (f.budget) add(5, `Gave a budget: ${BUDGETS[f.budget]}`);
  if (f.purpose) add(3, f.purpose === 'SELF' ? 'Buying to live in' : 'Buying as an investment');

  // 2. What they did on the site before enquiring
  const s = f.signals;
  if (s) {
    if (s.days >= 2) add(8, `Came back on ${s.days} different days`);
    else if (s.views >= 2) add(5, `Opened this page ${s.views} times`);
    if (s.tools.length) add(Math.min(4 + 2 * s.tools.length, 8), `Used the ${s.tools.map((t) => ({ emi: 'EMI', afford: 'affordability', cost: 'buying-cost' })[t] ?? t).join(' and ')} calculator${s.tools.length > 1 ? 's' : ''}`);
    if (s.compared > 0) add(4, 'Compared homes or localities');
    if (s.pages >= 3) add(4, `Looked at ${s.pages} other projects and areas`);
    if (s.asked > 0) add(3, 'Asked the assistant a question');
    if (s.seconds >= 60) add(3, 'Spent over a minute on the page');
  }

  // 3. How they got in touch
  if (f.email) add(4, 'Gave an email address as well as a phone number');
  const message = f.message?.trim() ?? '';
  if (message.length >= 20) add(4, 'Wrote a message');
  if (ASKS.test(message)) add(3, 'The message asks about a visit, price or booking');
  if (f.earlierHere > 0) add(4, f.earlierHere === 1 ? 'Has enquired about this before' : `Has enquired about this ${f.earlierHere} times before`);

  // Signs it is not a real buyer
  if (junkPhone(f.phone)) add(-40, 'The phone number looks made up');
  if (junkName(f.name)) add(-15, 'The name looks like a test or a placeholder');
  if (f.lastDay >= 8) add(-20, `${f.lastDay} other enquiries from this number in a day: may be a broker or automated`);

  const score = Math.max(0, Math.min(100, reasons.reduce((n, r) => n + r.points, 0)));
  reasons.sort((a, b) => b.points - a.points);
  return { score, band: bandOf(score), reasons };
}

const pick = <T extends string>(codes: Record<T, string>, v: unknown): T | null => (typeof v === 'string' && v in codes ? (v as T) : null);
const count = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(Math.round(v), max)) : 0);

/** Reads the buyer's answers and their browser's notes from a request, keeping only what is expected and within bounds. */
export function readIntent(body: Record<string, unknown>) {
  const raw = (() => { try { return typeof body.signals === 'string' ? JSON.parse(body.signals) : body.signals; } catch { return null; } })() as Record<string, unknown> | null;
  const signals: Signals | null = raw && typeof raw === 'object'
    ? { views: count(raw.views, 50), days: count(raw.days, 60), seconds: count(raw.seconds, 3600), pages: count(raw.pages, 200), compared: count(raw.compared, 50), asked: count(raw.asked, 50), tools: Array.isArray(raw.tools) ? [...new Set(raw.tools.filter((t): t is string => ['emi', 'afford', 'cost'].includes(t as string)))] : [] }
    : null;
  return {
    timeline: pick(TIMELINES, body.timeline), budget: pick(BUDGETS, body.budget), loan: pick(LOANS, body.loan), purpose: pick(PURPOSES, body.purpose),
    wantsVisit: body.wantsVisit === true || body.wantsVisit === 'on' || body.wantsVisit === 'true', signals,
  };
}

/** The buyer's answers in words, for emails and spreadsheets. */
export function intentInWords(e: { timeline: string | null; budget: string | null; loan: string | null; purpose: string | null; wantsVisit: boolean }): string[] {
  return [
    e.timeline && e.timeline in TIMELINES ? `Buying: ${TIMELINES[e.timeline as Timeline].toLowerCase()}` : '',
    e.budget && e.budget in BUDGETS ? `Budget: ${BUDGETS[e.budget as Budget]}` : '',
    e.loan && e.loan in LOANS ? LOANS[e.loan as Loan] : '',
    e.purpose && e.purpose in PURPOSES ? PURPOSES[e.purpose as Purpose] : '',
    e.wantsVisit ? 'Wants a site visit' : '',
  ].filter(Boolean);
}

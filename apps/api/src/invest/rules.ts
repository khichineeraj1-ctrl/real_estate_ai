/**
 * Rules for the investor corner. It reports what a government plan says and how far along it is, with the documents
 * linked. It does not predict prices or returns, and text that does is refused before a person has to judge it.
 */
export const DRIVERS = ['CITY', 'AIRPORT', 'CORRIDOR', 'INDUSTRIAL', 'TRANSIT', 'PORT', 'OTHER'] as const;
export const DRIVER_LABEL: Record<(typeof DRIVERS)[number], string> = { CITY: 'New city or township', AIRPORT: 'Airport', CORRIDOR: 'Expressway or corridor', INDUSTRIAL: 'Industrial zone', TRANSIT: 'Metro or rail', PORT: 'Port or logistics hub', OTHER: 'Other plan' };
export const STAGES = ['ANNOUNCED', 'APPROVED', 'LAND', 'BUILDING', 'OPEN'] as const;
export const STAGE_LABEL: Record<(typeof STAGES)[number], string> = { ANNOUNCED: 'Announced', APPROVED: 'Approved', LAND: 'Land being acquired', BUILDING: 'Being built', OPEN: 'Open' };
/** What each stage means for someone thinking of buying nearby, in plain words. */
export const STAGE_MEANS: Record<(typeof STAGES)[number], string> = {
  ANNOUNCED: 'Only announced. No approval or money is committed yet, and many announcements never go further.',
  APPROVED: 'Formally approved, but nothing is built. Timelines at this stage often slip by years.',
  LAND: 'The government is acquiring land. Check that the plot you are shown is not itself marked for acquisition.',
  BUILDING: 'Construction is under way. Delays are still common; rely on what is finished, not on the target date.',
  OPEN: 'At least part of it is working. What is built can be visited and checked.',
};
export const BUDGETS = { U25L: 'Under ₹25 lakh', '25_50L': '₹25 to 50 lakh', '50L_1CR': '₹50 lakh to 1 crore', '1_3CR': '₹1 to 3 crore', '3CR_PLUS': 'Over ₹3 crore' } as const;
export const WANTS = { PLOT: 'A plot', FARM: 'Farm land', INDUSTRIAL: 'Industrial or warehouse land', BUILT: 'A shop or warehouse', HOME: 'A flat or house', ANY: 'Not sure yet' } as const;
export const HORIZONS = { NOW: 'Ready to buy now', '6M': 'In the next six months', LATER: 'Just exploring' } as const;

/** Said on every page of the corner, in the same words. */
export const INVEST_NOTICE = 'This is information, not investment advice. We do not predict prices or returns. Government plans change, run late, and are sometimes dropped; read the linked documents and take independent advice before you buy.';

const PROMISE = /guarante|assured|sure[- ]?shot|risk[- ]?free|no risk|double (your|the) money|multibagger|\d+\s?x\b|\d+(\.\d+)?\s?%\s?(returns?|appreciation|growth|gain|profit|roi|cagr|per (year|annum))|returns? of \d|prices? (will|are set to|are going to|to) (rise|double|triple|jump|shoot|soar)|will (double|triple)|best investment|can'?t (go wrong|lose)|get rich/i;
/** The first phrase that promises or predicts a gain, or null. Such text is not allowed anywhere in the corner. */
export function promiseWords(text: string | null | undefined): string | null {
  const m = text ? PROMISE.exec(text) : null;
  return m ? m[0].trim() : null;
}

export interface Source { label: string; url: string }
export interface Milestone { when: string; what: string }
/** Lines of "Label | https://…". Every line must have a web address, so nothing is stated without where it came from. */
export function readSources(text: string): { sources: Source[]; error?: string } {
  const sources: Source[] = [];
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [label, url] = line.split('|').map((x) => x.trim());
    if (!label || !url) return { sources, error: `“${line.slice(0, 60)}” needs a name and a web address, separated by |` };
    try { const u = new URL(url); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error(); } catch { return { sources, error: `“${url.slice(0, 60)}” is not a web address` }; }
    sources.push({ label: label.slice(0, 140), url: url.slice(0, 500) });
  }
  return sources.length > 12 ? { sources, error: 'At most 12 sources' } : { sources };
}
/** Lines of "When | What", e.g. "2027 | First runway to open (authority's target)". */
export function readMilestones(text: string): { milestones: Milestone[]; error?: string } {
  const milestones: Milestone[] = [];
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const at = line.indexOf('|');
    const when = at > 0 ? line.slice(0, at).trim() : ''; const what = at > 0 ? line.slice(at + 1).trim() : '';
    if (!when || !what) return { milestones, error: `“${line.slice(0, 60)}” needs a date and what happens, separated by |` };
    milestones.push({ when: when.slice(0, 40), what: what.slice(0, 240) });
  }
  return milestones.length > 12 ? { milestones, error: 'At most 12 milestones' } : { milestones };
}

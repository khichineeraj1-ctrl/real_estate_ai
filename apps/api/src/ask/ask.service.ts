import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { CatalogService, PropertyCard, PropertyFilters, Stats } from '../catalog/catalog.service';
import { Gazetteer, Parsed, comparison, matchPlace, parseQuestion, rupees } from './parse';

export interface Turn { role: 'user' | 'assistant'; text: string }
export const MAX_MESSAGE = 300;
const MAX_TURNS = 6;
const BRAND = process.env.BRAND_NAME || 'HomeAsk';

export interface AskResult {
  reply: string;
  /** true when Claude wrote the reply; false when the built-in parser did. */
  live: boolean;
  properties: PropertyCard[];
  total: number;
  /** The indexable page that shows everything the answer is about, e.g. /gurgaon/sector-57/3-bhk-flats. */
  page: { path: string; label: string } | null;
  /** Which filter was dropped (budget, locality or status) when nothing matched the question as asked; null for an exact match. */
  relaxed: string | null;
}

/** Keeps only the last few turns the client sent, each short, with roles forced to user or assistant. */
export function cleanTurns(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const out: Turn[] = [];
  for (const t of raw.slice(-MAX_TURNS)) {
    const role = t?.role === 'assistant' ? 'assistant' : t?.role === 'user' ? 'user' : null;
    const text = typeof t?.text === 'string' ? t.text.trim().slice(0, MAX_MESSAGE * 3) : '';
    if (role && text) out.push({ role, text });
  }
  return out;
}

/** Per-visitor and per-day limits, so a public endpoint that spends money cannot be run up. */
export class Limiter {
  private hits = new Map<string, number[]>();
  private day = '';
  private today = 0;
  constructor(private perMinute: number, private dailyCap: number, private now: () => number = Date.now) {}
  allow(who: string): boolean {
    const t = this.now();
    const d = new Date(t).toDateString();
    if (d !== this.day) { this.day = d; this.today = 0; this.hits.clear(); }
    if (this.today >= this.dailyCap) return false;
    const recent = (this.hits.get(who) ?? []).filter((x) => t - x < 60_000);
    if (recent.length >= this.perMinute) return false;
    recent.push(t); this.hits.set(who, recent); this.today++;
    return true;
  }
}

interface Outcome { filters: PropertyFilters; items: PropertyCard[]; total: number; stats: Stats; relaxed: string | null; place: string }

/** How far we have verified a home and its seller, in the words the assistant may use. */
const CONFIDENCE_WORDS = ['not yet verified', 'basic checks only', 'good confidence', 'high confidence'];

const TYPE_WORD = { APARTMENT: 'flats', VILLA: 'villas', BUILDER_FLOOR: 'builder floors', PLOT: 'plots' } as const;

const SEARCH_TOOL = {
  name: 'search_properties',
  description: 'Search the live property listings. Call this before saying anything about what is available, prices in an area, or specific homes. Every argument is optional; leave out what the buyer did not say.',
  input_schema: {
    type: 'object' as const,
    properties: {
      city: { type: 'string', description: 'City name, e.g. "Gurgaon"' },
      locality: { type: 'string', description: 'Locality name, e.g. "Whitefield" or "Sector 57"' },
      bhk: { type: 'integer', description: 'Number of bedrooms' },
      type: { type: 'string', enum: ['APARTMENT', 'VILLA', 'BUILDER_FLOOR', 'PLOT'] },
      status: { type: 'string', enum: ['READY_TO_MOVE', 'UNDER_CONSTRUCTION'] },
      min_price_inr: { type: 'integer', description: 'Lowest price in rupees. 1 lakh = 100000, 1 crore = 10000000.' },
      max_price_inr: { type: 'integer', description: 'Highest price in rupees' },
      sort: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'] },
    },
  },
};

@Injectable()
export class AskService {
  private log = new Logger('Ask');
  private limiter = new Limiter(Number(process.env.ASK_PER_MIN ?? 10), Number(process.env.ASK_DAILY_CAP ?? 3000));
  private client: Anthropic | null = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? new Anthropic() : null;
  constructor(private readonly catalog: CatalogService) {}

  /** Runs a search; when nothing matches it loosens the budget, then the locality, and says which it loosened. */
  async search(p: Omit<Parsed, 'intent'>): Promise<Outcome> {
    const base: PropertyFilters = { city: p.city?.slug, locality: p.locality?.slug, bhk: p.bhk, type: p.type, status: p.status, minPrice: p.minPrice, maxPrice: p.maxPrice, sort: p.sort, pageSize: 6 };
    const place = p.locality ? `${p.locality.name}, ${p.city!.name}` : p.city ? p.city.name : 'Gurgaon, Bengaluru, Mumbai and Pune';
    let res = await this.catalog.list(base);
    if (res.total > 0) return { filters: base, items: res.items, total: res.total, stats: res.stats, relaxed: null, place };
    const attempts: [string, PropertyFilters][] = [];
    if (base.minPrice != null || base.maxPrice != null) attempts.push(['budget', { ...base, minPrice: undefined, maxPrice: undefined, sort: base.maxPrice != null ? 'price_asc' : base.sort }]);
    if (base.locality) attempts.push(['locality', { ...base, locality: undefined }]);
    if (base.status) attempts.push(['status', { ...base, status: undefined }]);
    if (base.locality && (base.minPrice != null || base.maxPrice != null)) attempts.push(['locality', { ...base, locality: undefined, minPrice: undefined, maxPrice: undefined }]);
    for (const [what, f] of attempts) {
      res = await this.catalog.list(f);
      if (res.total > 0) return { filters: f, items: res.items, total: res.total, stats: res.stats, relaxed: what, place: what === 'locality' ? p.city!.name : place };
    }
    return { filters: base, items: [], total: 0, stats: res.stats, relaxed: null, place };
  }

  private describe(p: Omit<Parsed, 'intent'>, count: number) {
    const kind = p.type ? TYPE_WORD[p.type] : 'homes';
    const noun = count === 1 ? kind.replace(/s$/, '') : kind;
    const budget = p.minPrice != null && p.maxPrice != null ? ` between ${rupees(p.minPrice)} and ${rupees(p.maxPrice)}` : p.maxPrice != null ? ` under ${rupees(p.maxPrice)}` : p.minPrice != null ? ` above ${rupees(p.minPrice)}` : '';
    return `${p.status === 'READY_TO_MOVE' ? 'ready-to-move ' : p.status === 'UNDER_CONSTRUCTION' ? 'under-construction ' : ''}${p.bhk ? `${p.bhk} BHK ` : ''}${noun}${budget}`;
  }

  private pageFor(f: PropertyFilters, gazetteer: Gazetteer): AskResult['page'] {
    const city = gazetteer.find((c) => c.slug === f.city);
    if (!city) return null;
    const locality = city.localities.find((l) => l.slug === f.locality);
    if (locality && f.bhk) return { path: `/${city.slug}/${locality.slug}/${f.bhk}-bhk-flats`, label: `${f.bhk} BHK homes in ${locality.name}, ${city.name}` };
    if (locality) return { path: `/${city.slug}/${locality.slug}`, label: `Property in ${locality.name}, ${city.name}` };
    return { path: `/${city.slug}`, label: `Property in ${city.name}` };
  }

  /** The answer written without a model: parse the question, search, and say what was found in plain words. */
  /** The page that sets two localities side by side; the pair is written alphabetically so each comparison has one address. */
  private comparePage(c: NonNullable<ReturnType<typeof comparison>>): NonNullable<AskResult['page']> {
    return { path: `/${c.city.slug}/compare/${[c.a.slug, c.b.slug].sort().join('-vs-')}`, label: `${c.a.name} vs ${c.b.name} compared` };
  }

  /** "X vs Y": the two areas' asking rates and choice, with a few homes from each and a link to the full comparison. */
  private async compareLocalities(c: NonNullable<ReturnType<typeof comparison>>): Promise<AskResult> {
    const [a, b] = await Promise.all([c.a, c.b].map((l) => this.catalog.list({ city: c.city.slug, locality: l.slug, pageSize: 3 })));
    const rate = (n: number | null) => (n == null ? 'no listings' : `₹${n.toLocaleString('en-IN')} per sq ft`);
    const ra = a.stats.avgRate, rb = b.stats.avgRate;
    let verdict = '';
    if (ra != null && rb != null && ra !== rb) {
      const [low, high, lowRate, highRate] = ra < rb ? [c.a, c.b, ra, rb] : [c.b, c.a, rb, ra];
      verdict = ` ${low.name} is about ${Math.round(((highRate - lowRate) / highRate) * 100)}% cheaper per square foot than ${high.name}.`;
    }
    const from = (s: typeof a.stats) => (s.minPrice != null ? `, starting at ${rupees(s.minPrice)}` : '');
    return {
      reply: `${c.a.name} averages ${rate(ra)} with ${a.total} ${a.total === 1 ? 'home' : 'homes'} listed${from(a.stats)}. ${c.b.name} averages ${rate(rb)} with ${b.total}${from(b.stats)}.${verdict}`,
      live: false, properties: [...a.items, ...b.items], total: a.total + b.total, page: this.comparePage(c), relaxed: null,
    };
  }

  async scripted(question: string, gazetteer: Gazetteer, context = ''): Promise<AskResult> {
    const versus = comparison(question, gazetteer);
    if (versus) return this.compareLocalities(versus);
    const p = parseQuestion(question, gazetteer);
    // "3 BHK under 2 crore" asked on a locality page means that locality.
    if (!p.city) Object.assign(p, matchPlace(context, gazetteer));
    const asked = p.city || p.bhk || p.type || p.status || p.minPrice != null || p.maxPrice != null || p.sort;
    if (!asked) {
      return {
        reply: `I can help you find a home in Gurgaon, Bengaluru, Mumbai or Pune. Tell me the area, the size and your budget, for example: "3 BHK in Whitefield under 1.5 crore".`,
        live: false, properties: [], total: 0, page: null, relaxed: null,
      };
    }
    const o = await this.search(p);
    const page = this.pageFor(o.filters, gazetteer);
    if (o.total === 0) return { reply: `No ${this.describe(p, 2)} are listed in ${o.place} yet. Homes appear here as owners, agents and builders post them; the area page shows the builder projects registered there.`, live: false, properties: [], total: 0, page, relaxed: null };

    const s = o.stats;
    const range = s.minPrice === s.maxPrice ? `priced at ${rupees(s.minPrice!)}` : `priced from ${rupees(s.minPrice!)} to ${rupees(s.maxPrice!)}`;
    const rate = s.avgRate ? `, about ₹${s.avgRate.toLocaleString('en-IN')} per sq ft on average` : '';
    let reply: string;
    if (o.relaxed === 'budget') reply = `Nothing in ${o.place} fits that budget for ${this.describe({ ...p, minPrice: undefined, maxPrice: undefined }, 2)}. The closest I have are ${o.total} ${range}.`;
    else if (o.relaxed === 'locality') reply = `I have no ${this.describe(p, 2)} in ${p.locality!.name}, but there are ${o.total} elsewhere in ${p.city!.name}, ${range}.`;
    else if (o.relaxed === 'status') reply = `None are ${p.status === 'READY_TO_MOVE' ? 'ready to move' : 'under construction'}, but I found ${o.total} ${this.describe({ ...p, status: undefined }, o.total)} in ${o.place}, ${range}.`;
    else if (p.intent === 'price') reply = `Homes in ${o.place} are asking about ₹${s.avgRate?.toLocaleString('en-IN')} per sq ft on average. The ${o.total} listed here are ${range}.`;
    else reply = `I found ${o.total} ${this.describe(p, o.total)} in ${o.place}, ${range}${rate}.`;
    const top = o.items[0];
    if (top && p.intent !== 'price') reply += ` ${p.sort === 'price_asc' ? 'The cheapest' : 'One of them'} is a ${top.title.split(' in ')[0]} of ${top.areaSqft.toLocaleString('en-IN')} sq ft in ${top.locality.name} for ${rupees(top.priceInr)} (${CONFIDENCE_WORDS[top.confidence] ?? CONFIDENCE_WORDS[0]}).`;
    return { reply, live: false, properties: o.items, total: o.total, page, relaxed: o.relaxed };
  }

  private system(gazetteer: Gazetteer) {
    return [
      `You are the assistant of ${BRAND}, a property search service for home buyers in India. People type or speak to you, and your reply is shown on screen and read aloud.`,
      `Places covered: ${gazetteer.map((c) => `${c.name} (${c.localities.map((l) => l.name).join(', ')})`).join('; ')}.`,
      'Anything you say about what is for sale, what an area costs, or a specific home must come from the search_properties tool: search first, then answer. If a search finds nothing, say so and suggest the nearest alternative the tool shows you (it loosens the budget or area itself and tells you in "note"). Never invent a listing, price or project.',
      'For general questions (home loans, stamp duty, RERA, how to check a title, which area suits a commute) answer from what you know, briefly, and say when a figure varies by state or should be confirmed with a professional.',
      'Each home in a search result has a "confidence": how far our team has verified the home and its seller. Results come most-verified first. When you single out a home, prefer one with good or high confidence and say so in a few words; if the only matches are not yet verified, say that plainly and remind the buyer to see the home and its papers before paying anything. Never describe a home as verified, safe or genuine beyond what its confidence says.',
      'Because replies are spoken, keep them to two or three short sentences with no lists, markdown or links; the matching homes appear as cards under your reply, so summarise them (how many, price range, one standout) instead of reading each one. Say amounts the Indian way, like "₹85 lakh" or "₹1.2 crore". Reply in the language the buyer used, including Hindi or Hinglish.',
    ].join('\n\n');
  }

  /** `context` is the place the buyer is looking at (a page title such as "Sector 57, Gurgaon"), used when the question names no place. */
  async ask(who: string, message: string, history: Turn[], context = ''): Promise<AskResult> {
    const result = await this.answer(who, message, history, context);
    // Logged for the admin panel's "questions" screen: the words and the outcome only, nothing about who asked.
    this.catalog.logQuestion({ text: message.trim().slice(0, MAX_MESSAGE), live: result.live, total: result.total, relaxed: result.relaxed, page: result.page?.path ?? null })
      .catch((e: Error) => this.log.warn(`could not log question: ${e.message}`));
    return result;
  }

  private async answer(who: string, message: string, history: Turn[], context: string): Promise<AskResult> {
    const q = message.trim().slice(0, MAX_MESSAGE);
    const gazetteer = await this.catalog.gazetteer();
    if (!this.client || !this.limiter.allow(who)) return this.scripted(q, gazetteer, context);

    const model = process.env.ASSISTANT_MODEL || 'claude-opus-5-5';
    // Models with safety classifiers that can decline a request get the server-side fallback, so a false positive still gets answered.
    const withFallback = /^claude-(opus-5|fable-5|sonnet-5-5)/.test(model);
    const messages: Anthropic.Beta.BetaMessageParam[] = [...history.map((t) => ({ role: t.role, content: t.text })), { role: 'user' as const, content: context ? `${q}\n\n[The buyer is currently viewing: ${context}]` : q }];
    let last: Outcome | null = null;
    // When the question weighs two localities, the answer links to their side-by-side page whatever the model searched last.
    const versus = comparison(q, gazetteer);
    try {
      for (let round = 0; round < 4; round++) {
        const res = await this.client.beta.messages.create({
          model, max_tokens: 4000, system: this.system(gazetteer), tools: [SEARCH_TOOL], messages,
          output_config: { effort: 'low' }, // short lookups and answers; keeps voice replies quick
          ...(round === 3 ? { tool_choice: { type: 'none' as const } } : {}), // last round: answer in words
          ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        }, { timeout: 30_000 });
        if (res.stop_reason === 'refusal') throw new Error('model declined');
        const calls = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
        if (res.stop_reason === 'tool_use' && calls.length) {
          messages.push({ role: 'assistant', content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const c of calls) {
            const i = (c.input ?? {}) as Record<string, unknown>;
            const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined);
            const place = matchPlace([i.locality, i.city].filter((x) => typeof x === 'string').join(' '), gazetteer);
            last = await this.search({
              ...place, bhk: num(i.bhk), minPrice: num(i.min_price_inr), maxPrice: num(i.max_price_inr),
              type: Object.keys(TYPE_WORD).includes(i.type as string) ? (i.type as Parsed['type']) : undefined,
              status: i.status === 'READY_TO_MOVE' || i.status === 'UNDER_CONSTRUCTION' ? i.status : undefined,
              sort: i.sort === 'price_asc' || i.sort === 'price_desc' ? i.sort : undefined,
            });
            const unknownPlace = (i.city || i.locality) && !place.city ? 'That place is not covered yet; these results are from all covered cities.' : null;
            if (unknownPlace) last = { ...last, relaxed: 'area (a place not covered yet)' }; // so the admin log shows demand for places we do not have
            results.push({
              type: 'tool_result', tool_use_id: c.id,
              content: JSON.stringify({
                total: last.total, where: last.place, price_range_inr: [last.stats.minPrice, last.stats.maxPrice], avg_rate_per_sqft: last.stats.avgRate,
                note: unknownPlace ?? (last.relaxed ? `Nothing matched exactly, so the ${last.relaxed} filter was dropped.` : null),
                shown: last.items.map((p) => ({ title: p.title, price_inr: p.priceInr, area_sqft: p.areaSqft, status: p.status, project: p.project?.name ?? null, confidence: CONFIDENCE_WORDS[p.confidence] ?? CONFIDENCE_WORDS[0] })),
              }),
            });
          }
          messages.push({ role: 'user', content: results });
          continue;
        }
        const reply = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join(' ').trim();
        if (!reply) throw new Error(`empty reply (${res.stop_reason})`);
        return { reply: reply.slice(0, 900), live: true, properties: last?.items ?? [], total: last?.total ?? 0, page: versus ? this.comparePage(versus) : last ? this.pageFor(last.filters, gazetteer) : null, relaxed: last?.relaxed ?? null };
      }
      throw new Error('too many tool rounds');
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) this.log.error('Claude credentials were rejected; answering with the built-in parser.');
      else if (e instanceof Anthropic.RateLimitError) this.log.warn('Claude rate limit reached; answering with the built-in parser.');
      else if (e instanceof Anthropic.APIError) this.log.warn(`Claude API error ${e.status}: ${e.message}; answering with the built-in parser.`);
      else this.log.warn(`${(e as Error).message}; answering with the built-in parser.`);
      return this.scripted(q, gazetteer, context);
    }
  }
}

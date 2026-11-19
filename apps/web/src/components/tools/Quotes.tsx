'use client';

import { useState } from 'react';
import type { CityCosts } from '@/lib/finance';
import { price as short } from '@/lib/format';
import { noteTool } from '@/lib/intent';
import { LOAN_DEFAULTS, loanPlan } from '@/lib/finance';
import { TYPICAL_LOADING_PCT, blankQuote, delayCost, quoteBill, type Quote } from '@/lib/quote';

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const toNum = (v: string) => { const n = Number(v.replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };
interface City { slug: string; name: string; costs: CityCosts | null }
const MAX = 3;
const LETTERS = ['A', 'B', 'C'];

function Money({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="qfield"><span>{label}{hint && <em> {hint}</em>}</span>
      <span className="qinput"><i aria-hidden="true">₹</i><input inputMode="numeric" value={value ? value.toLocaleString('en-IN') : ''} placeholder="0" onChange={(e) => onChange(toNum(e.target.value))} /></span>
    </label>
  );
}
function Area({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="qfield"><span>{label}{hint && <em> {hint}</em>}</span>
      <span className="qinput"><input inputMode="numeric" value={value || ''} placeholder="Not given" onChange={(e) => onChange(toNum(e.target.value))} /><i aria-hidden="true">sq ft</i></span>
    </label>
  );
}

/**
 * One to three builder quotes, put on the same footing: the price per carpet square foot with every charge in, and
 * the whole bill. Start with one quote to see its true price; add more to compare.
 */
export function QuoteCompare({ cities }: { cities: City[] }) {
  const usable = cities.filter((c) => c.costs);
  const [citySlug, setCitySlug] = useState(usable[0]?.slug ?? '');
  const [quotes, setQuotes] = useState<Quote[]>([blankQuote('Quote A')]);
  const costs = usable.find((c) => c.slug === citySlug)?.costs ?? null;
  const bills = quotes.map((q) => quoteBill(q, costs));
  const set = (i: number, patch: Partial<Quote>) => { noteTool('cost'); setQuotes((now) => now.map((q, j) => (j === i ? { ...q, ...patch } : q))); };
  const best = (values: number[]) => { const real = values.filter((v) => v > 0); if (real.length < 2 || real.every((v) => v === real[0])) return -1; return values.indexOf(Math.min(...real)); };
  const bestCarpet = best(bills.map((b) => b.perCarpetAllIn)); const bestTotal = best(bills.map((b) => b.total)); const bestQuoted = best(bills.map((b) => b.perSuperQuoted));
  const flipped = bestQuoted >= 0 && bestCarpet >= 0 && bestQuoted !== bestCarpet;
  return (
    <div className="quotes">
      <div className="quotes-top">
        <div className="picks" role="group" aria-label="City, for stamp duty and registration">
          {usable.map((c) => <button key={c.slug} type="button" className="pick" aria-pressed={c.slug === citySlug} onClick={() => setCitySlug(c.slug)}>{c.name}</button>)}
        </div>
        {quotes.length < MAX && <button type="button" className="abtn quiet" onClick={() => setQuotes((now) => [...now, { ...blankQuote(`Quote ${LETTERS[now.length]}`), base: now[now.length - 1].base, superArea: now[now.length - 1].superArea }])}>+ Add another quote</button>}
      </div>

      {quotes.length > 1 && bestCarpet >= 0 && (
        <p className={`quotes-verdict ${flipped ? 'tone-warn' : 'tone-good'}`} aria-live="polite">
          <strong>{flipped ? `${quotes[bestQuoted].name} looks cheaper, but ${quotes[bestCarpet].name} is.` : `${quotes[bestCarpet].name} is the better price.`}</strong>{' '}
          {flipped
            ? `${quotes[bestQuoted].name} quotes the lower rate (${rupees(bills[bestQuoted].perSuperQuoted)} a sq ft), but once carpet area and every charge are counted ${quotes[bestCarpet].name} costs ${rupees(bills[bestCarpet].perCarpetAllIn)} per usable sq ft against ${rupees(bills[bestQuoted].perCarpetAllIn)}.`
            : `It costs ${rupees(bills[bestCarpet].perCarpetAllIn)} per usable sq ft with every charge in${bestTotal >= 0 && bestTotal !== bestCarpet ? `, though ${quotes[bestTotal].name} has the smaller total bill (${short(bills[bestTotal].total)})` : ''}.`}
        </p>
      )}

      <div className={`quote-cols cols-${quotes.length}`}>
        {quotes.map((q, i) => {
          const b = bills[i];
          const parts = [{ k: 'Basic price', v: q.base, c: 's1' }, { k: 'Extras', v: b.extras, c: 's2' }, { k: 'Government charges', v: b.government, c: 's3' }];
          return (
            <section key={i} className={`quote ${i === bestCarpet ? 'is-best' : ''}`} aria-label={q.name}>
              <header>
                <input className="quote-name" aria-label="Name of this quote" value={q.name} maxLength={30} onChange={(e) => set(i, { name: e.target.value })} />
                {quotes.length > 1 && <button type="button" className="quote-x" aria-label={`Remove ${q.name}`} onClick={() => setQuotes((now) => now.filter((_, j) => j !== i))}>×</button>}
              </header>

              <div className="quote-out" aria-live="polite">
                <p className="quote-hero"><span>You really pay</span><strong>{rupees(b.perCarpetAllIn)}</strong><small>per usable sq ft{i === bestCarpet ? ' · lowest' : ''}</small></p>
                <p className="quote-vs">The quote says <b>{rupees(b.perSuperQuoted)}</b> a sq ft. That is on {q.superArea.toLocaleString('en-IN')} sq ft, of which about <b>{b.carpet.toLocaleString('en-IN')}</b> is yours to use{b.carpetEstimated ? ` (estimated at ${TYPICAL_LOADING_PCT}% loading; ask for the carpet area)` : ` (${b.loadingPct}% loading)`}.</p>
                <div className="quote-bar" role="img" aria-label={parts.map((x) => `${x.k} ${short(x.v)}`).join(', ')}>{parts.map((x) => x.v > 0 && <i key={x.k} className={x.c} style={{ flexGrow: x.v }} />)}</div>
                <ul className="quote-parts">
                  {parts.map((x) => <li key={x.k}><i className={`key ${x.c}`} aria-hidden="true" /><span>{x.k}</span><strong>{short(x.v)}</strong></li>)}
                  <li className="quote-total"><span>Whole bill</span><strong className={i === bestTotal ? 'is-low' : ''}>{short(b.total)}</strong></li>
                </ul>
              </div>

              <div className="quote-in">
                <Money label="Basic price quoted" value={q.base} onChange={(n) => set(i, { base: n })} />
                <Area label="Area quoted on" hint="(super built-up)" value={q.superArea} onChange={(n) => set(i, { superArea: n })} />
                <Area label="Carpet area" hint="(if given)" value={q.carpetArea} onChange={(n) => set(i, { carpetArea: n })} />
                <Money label="Parking" value={q.parking} onChange={(n) => set(i, { parking: n })} />
                <Money label="Club membership" value={q.club} onChange={(n) => set(i, { club: n })} />
                <Money label="Location and floor charges" hint="(PLC)" value={q.plc} onChange={(n) => set(i, { plc: n })} />
                <Money label="Maintenance deposit" value={q.deposit} onChange={(n) => set(i, { deposit: n })} />
                <Money label="Anything else" value={q.other} onChange={(n) => set(i, { other: n })} />
                <div className="picks" role="group" aria-label="The home is">
                  <button type="button" className="pick" aria-pressed={q.underConstruction} onClick={() => set(i, { underConstruction: true })}>Under construction</button>
                  <button type="button" className="pick" aria-pressed={!q.underConstruction} onClick={() => set(i, { underConstruction: false })}>Ready to move</button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <p className="calc-note">An estimate to put quotes on the same footing, not a quote. GST is taken on an under-construction home and what is sold with it; stamp duty and registration at {usable.find((c) => c.slug === citySlug)?.name}’s rates. Where no carpet area is entered, {TYPICAL_LOADING_PCT}% of the quoted area is assumed to be walls and shared space; real loading runs from about 20% to 40%, so ask for the figure in writing.</p>
    </div>
  );
}

/** What a delay in possession costs a buyer who is renting, and what the builder would owe them for it. */
export function DelayCalculator() {
  const [months, setMonths] = useState(12);
  const [rent, setRent] = useState(35_000);
  const [paid, setPaid] = useState(5_000_000);
  const [pct, setPct] = useState(11);
  const [price, setPrice] = useState(10_000_000);
  const d = delayCost(months, rent, paid, pct);
  const emi = loanPlan(price, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years).monthly;
  const fill = (months / 36) * 100;
  return (
    <div className="calc" onInput={() => noteTool('cost')}>
      <div className="calc-inputs">
        <div className="delay-months">
          <p className="quick-label">If possession is late by</p>
          <p className="quick-price" aria-live="polite">{months} month{months === 1 ? '' : 's'}</p>
          <input className="quick-slider" type="range" aria-label="Months of delay" min={0} max={36} step={1} value={months} style={{ '--fill': `${fill}%` } as React.CSSProperties} onChange={(e) => setMonths(Number(e.target.value))} />
          <div className="picks">{[6, 12, 24, 36].map((m) => <button key={m} type="button" className="pick" aria-pressed={months === m} onClick={() => setMonths(m)}>{m} months</button>)}</div>
        </div>
        <Money label="Rent you pay each month" value={rent} onChange={setRent} />
        <Money label="Paid to the builder so far" value={paid} onChange={setPaid} />
        <Money label="Price of the home" hint="(for the EMI)" value={price} onChange={setPrice} />
        <label className="qfield"><span>Delay interest in your agreement <em>(% a year)</em></span>
          <span className="qinput"><input inputMode="decimal" value={pct || ''} onChange={(e) => setPct(toNum(e.target.value))} /><i aria-hidden="true">%</i></span>
        </label>
      </div>
      <div className="calc-out" aria-live="polite">
        <p className="calc-hero"><span>Extra rent you pay while you wait</span><strong>{short(d.rent)}</strong><small>{rupees(rent)} for each month it runs late, out of your pocket</small></p>
        <dl className="calc-result">
          <div><dt>Interest the builder owes you, if you claim it</dt><dd>{rupees(d.interestOwed)}</dd></div>
          <div><dt>{d.net > 0 ? 'Still yours to bear after that' : 'Left over after your rent, if paid in full'}</dt><dd>{rupees(Math.abs(d.net))}</dd></div>
          <div><dt>Rent and EMI together, each month</dt><dd>{rupees(rent + emi)}</dd></div>
        </dl>
        <p className="calc-note">While you wait you may be paying rent and the loan together: about {rupees(emi)} of EMI on this price (example loan, {LOAN_DEFAULTS.downPct}% down at {LOAN_DEFAULTS.ratePct}% over {LOAN_DEFAULTS.years} years) on top of {rupees(rent)} rent.</p>
      </div>
      <p className="calc-note">Under RERA a builder who misses the possession date owes the buyer interest for every month of delay on the money paid, at the rate in the rules of the state (commonly the State Bank of India’s lending rate plus 2%). Getting it paid can take a complaint to the state authority. This is arithmetic, not legal advice.</p>
    </div>
  );
}

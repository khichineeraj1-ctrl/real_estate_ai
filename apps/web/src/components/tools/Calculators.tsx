'use client';

import { useId, useState } from 'react';
import { LOAN_DEFAULTS, affordability, buyingCosts, loanPlan, type CityCosts } from '@/lib/finance';
import { price as short } from '@/lib/format';

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const num = (v: string, fallback = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; };

/* ---------- Inputs: a slider to drag, the exact figure to type, and one-tap common values ---------- */

interface Preset { label: string; value: number }
interface SliderProps {
  label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number;
  suffix?: string; hint?: string; presets?: Preset[];
}

/** The slider covers the usual range; the box beside it takes any figure, including ones beyond the slider. */
export function SliderField({ label, value, onChange, min, max, step, suffix, hint, presets }: SliderProps) {
  const id = useId();
  return (
    <div className="sfield">
      <div className="sfield-top">
        <label htmlFor={id}>{label}{suffix && <em> ({suffix})</em>}</label>
        <input id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} min={0} step={step} onChange={(e) => onChange(num(e.target.value))} />
      </div>
      <input type="range" aria-label={`${label}, slider`} min={min} max={max} step={step} value={Math.min(Math.max(value, min), max)} onChange={(e) => onChange(Number(e.target.value))} />
      {presets && (
        <div className="picks">
          {presets.map((p) => <button key={p.value} type="button" className="pick" aria-pressed={value === p.value} onClick={() => onChange(p.value)}>{p.label}</button>)}
        </div>
      )}
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Choice<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="sfield" role="group" aria-label={label}>
      <div className="sfield-top"><span className="sfield-label">{label}</span></div>
      <div className="picks">
        {options.map((o) => <button key={o.value} type="button" className="pick" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
      </div>
    </div>
  );
}

const PRICES: Preset[] = [{ label: '₹50 L', value: 5_000_000 }, { label: '₹1 Cr', value: 10_000_000 }, { label: '₹2 Cr', value: 20_000_000 }, { label: '₹5 Cr', value: 50_000_000 }];
const YEARS: Preset[] = [10, 15, 20, 25, 30].map((y) => ({ label: `${y}`, value: y }));
const PriceField = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <SliderField label="Home price" suffix="₹" value={value} onChange={onChange} min={1_000_000} max={50_000_000} step={100_000} presets={PRICES} hint={short(value)} />
);
const RateField = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <SliderField label="Interest rate" suffix="% a year" value={value} onChange={onChange} min={6} max={14} step={0.05} hint="An example rate. Use the rate your bank offers you." />
);
const YearsField = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <SliderField label="Loan period" suffix="years" value={value} onChange={(n) => onChange(Math.min(Math.max(n, 1), 30))} min={1} max={30} step={1} presets={YEARS} />
);

/* ---------- One whole split into its parts: a bar to look at, and the same figures listed beneath it ---------- */

interface Part { name: string; value: number; slot: 1 | 2 | 3 }

export function Split({ title, parts, money = short }: { title: string; parts: Part[]; money?: (n: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = parts.reduce((s, p) => s + Math.max(p.value, 0), 0);
  const share = (p: Part) => (total > 0 ? Math.max(p.value, 0) / total : 0);
  const pct = (p: Part) => { const s = share(p) * 100; return s > 0 && s < 1 ? '<1%' : `${Math.round(s)}%`; };
  let before = 0;
  const centres = parts.map((p) => { const c = before + share(p) / 2; before += share(p); return c * 100; });
  const on = active != null ? parts[active] : null;
  return (
    <figure className="split" onMouseLeave={() => setActive(null)}>
      <figcaption>{title}</figcaption>
      <div className="split-bar" role="img" aria-label={`${title}: ${parts.map((p) => `${p.name} ${money(p.value)}, ${pct(p)}`).join('; ')}`}>
        {total > 0 ? parts.map((p, i) => p.value > 0 && (
          <span
            key={p.name} tabIndex={0} className={`seg s${p.slot} ${active != null && active !== i ? 'is-dim' : ''}`} style={{ flexGrow: p.value }}
            onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
          >
            {share(p) >= 0.12 && <b>{pct(p)}</b>}
          </span>
        )) : <span className="seg is-empty" style={{ flexGrow: 1 }} />}
        {on && active != null && (
          <span className="split-tip" role="status" style={{ left: `clamp(84px, ${centres[active]}%, calc(100% - 84px))` }}>
            <i className={`key s${on.slot}`} />{on.name}<strong>{money(on.value)}</strong><em>{pct(on)}</em>
          </span>
        )}
      </div>
      <ul className="split-legend">
        {parts.map((p, i) => (
          <li key={p.name} className={active === i ? 'is-on' : ''} onMouseEnter={() => setActive(i)}>
            <i className={`key s${p.slot}`} /><span>{p.name}</span><strong>{money(p.value)}</strong><em>{pct(p)}</em>
          </li>
        ))}
      </ul>
    </figure>
  );
}

const Hero = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <p className="calc-hero" aria-live="polite"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</p>
);

/* ---------- The calculators ---------- */

/** Home-loan instalment for a price. With `price` given (a property page) the price is fixed; otherwise the buyer sets it. */
export function EmiCalculator({ price }: { price?: number }) {
  const [amount, setAmount] = useState(price ?? 10_000_000);
  const [downPct, setDownPct] = useState(LOAN_DEFAULTS.downPct);
  const [rate, setRate] = useState(LOAN_DEFAULTS.ratePct);
  const [years, setYears] = useState(LOAN_DEFAULTS.years);
  const p = loanPlan(amount, downPct, rate, years);
  return (
    <div className="calc">
      <div className="calc-inputs">
        {price == null && <PriceField value={amount} onChange={setAmount} />}
        <SliderField label="Down payment" suffix="% of price" value={downPct} onChange={(n) => setDownPct(Math.min(n, 100))} min={0} max={90} step={1} hint={`${rupees(p.downPayment)} from your own money`} presets={[10, 20, 30, 40].map((v) => ({ label: `${v}%`, value: v }))} />
        <RateField value={rate} onChange={setRate} />
        <YearsField value={years} onChange={setYears} />
      </div>
      <div className="calc-out">
        <Hero label="Monthly EMI" value={rupees(p.monthly)} sub={`for ${years} years on a loan of ${short(p.loan)}`} />
        <Split title={`Everything you pay over ${years} years`} parts={[{ name: 'Loan repaid', value: p.loan, slot: 1 }, { name: 'Interest to the bank', value: p.interest, slot: 2 }, { name: 'Down payment', value: p.downPayment, slot: 3 }]} />
        <dl className="calc-result">
          <div><dt>Total you repay the bank</dt><dd>{short(p.totalPaid)}</dd></div>
          <div><dt>Interest for every ₹100 borrowed</dt><dd>{p.loan > 0 ? `₹${Math.round((p.interest / p.loan) * 100)}` : '—'}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export function AffordabilityCalculator() {
  const [income, setIncome] = useState(150_000);
  const [other, setOther] = useState(0);
  const [savings, setSavings] = useState(2_000_000);
  const [rate, setRate] = useState(LOAN_DEFAULTS.ratePct);
  const [years, setYears] = useState(LOAN_DEFAULTS.years);
  const [share, setShare] = useState(LOAN_DEFAULTS.incomeSharePct);
  const a = affordability(income, other, savings, rate, years, share);
  return (
    <div className="calc">
      <div className="calc-inputs">
        <SliderField label="Household take-home pay" suffix="₹ a month" value={income} onChange={setIncome} min={25_000} max={1_000_000} step={5_000} hint={`${short(income * 12)} a year`} />
        <SliderField label="Other loan EMIs" suffix="₹ a month" value={other} onChange={setOther} min={0} max={200_000} step={1_000} hint="Car, personal or education loans you already repay." />
        <SliderField label="Savings for the down payment" suffix="₹" value={savings} onChange={setSavings} min={0} max={20_000_000} step={50_000} hint={short(savings)} />
        <SliderField label="Share of pay for all EMIs" suffix="%" value={share} onChange={setShare} min={10} max={70} step={1} hint="Lenders commonly allow 40–50%." presets={[35, 40, 45, 50].map((v) => ({ label: `${v}%`, value: v }))} />
        <RateField value={rate} onChange={setRate} />
        <YearsField value={years} onChange={setYears} />
      </div>
      <div className="calc-out">
        <Hero label="Home budget" value={short(a.budget)} sub={`with a home EMI of up to ${rupees(a.spare)} a month`} />
        <Split title="Where the budget comes from" parts={[{ name: 'Loan you could repay', value: a.loan, slot: 1 }, { name: 'Your savings', value: savings, slot: 3 }]} />
        <Split title="Your pay each month" money={rupees} parts={[{ name: 'Home EMI', value: a.spare, slot: 1 }, { name: 'Other EMIs', value: Math.min(other, income), slot: 2 }, { name: 'Left for everything else', value: Math.max(income - other - a.spare, 0), slot: 3 }]} />
        {a.spare === 0 && <p className="calc-note">Your existing EMIs already use the whole share of pay a lender would allow, so the budget is your savings alone.</p>}
      </div>
    </div>
  );
}

interface City { slug: string; name: string; costs: CityCosts | null }

/** Stamp duty, registration and GST on top of the price. On a property page the price, city and status are fixed. */
export function CostCalculator({ price, costs, cityName, underConstruction, cities }: { price?: number; costs?: CityCosts; cityName?: string; underConstruction?: boolean; cities?: City[] }) {
  const usable = (cities ?? []).filter((c): c is City & { costs: CityCosts } => !!c.costs);
  const [amount, setAmount] = useState(price ?? 10_000_000);
  const [citySlug, setCitySlug] = useState(usable[0]?.slug ?? '');
  const [building, setBuilding] = useState(underConstruction ?? false);
  const [woman, setWoman] = useState(false);
  const city = usable.find((c) => c.slug === citySlug);
  const rule = costs ?? city?.costs;
  const place = cityName ?? city?.name;
  if (!rule) return <p className="calc-note">We do not have the government charges for this city yet.</p>;
  const b = buyingCosts(amount, rule, { woman, underConstruction: building });
  const concession = rule.stampDutyWomenPct < rule.stampDutyPct;
  const onTop = amount > 0 ? (b.charges / amount) * 100 : 0;
  return (
    <div className="calc">
      <div className="calc-inputs">
        {price == null && <PriceField value={amount} onChange={setAmount} />}
        {!costs && <Choice label="City" value={citySlug} onChange={setCitySlug} options={usable.map((c) => ({ value: c.slug, label: c.name }))} />}
        {underConstruction == null && <Choice label="The home is" value={building ? 'uc' : 'ready'} onChange={(v) => setBuilding(v === 'uc')} options={[{ value: 'ready', label: 'Ready to move' }, { value: 'uc', label: 'Under construction' }]} />}
        <label className="acheck"><input type="checkbox" checked={woman} onChange={(e) => setWoman(e.target.checked)} /> <span>The home will be in a woman’s name alone{concession ? ` (stamp duty ${rule.stampDutyWomenPct}% instead of ${rule.stampDutyPct}% in ${place})` : ` (no lower rate in ${place})`}</span></label>
      </div>
      <div className="calc-out">
        <Hero label="Total cost to buy" value={short(b.total)} sub={`${short(amount)} listed price + ${short(b.charges)} in charges (${onTop.toFixed(1)}% on top)`} />
        <Split title="Charges on top of the price" money={rupees} parts={[{ name: `Stamp duty (${b.stampDutyPct}%)`, value: b.stampDuty, slot: 1 }, { name: 'Registration fee', value: b.registration, slot: 2 }, { name: building ? `GST (${b.gstPct}%)` : 'GST (none on a ready home)', value: b.gst, slot: 3 }]} />
      </div>
      <p className="calc-note">
        An estimate for {place}, not a quote. {rule.note} It leaves out the lawyer, brokerage, society transfer fees, loan processing and interiors.{' '}
        {rule.reviewedAt ? `Rates last checked by our team on ${new Date(rule.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}.` : 'These rates have not yet been checked by our team against the official schedule.'}{' '}
        Confirm the exact amount with the sub-registrar’s office or your lawyer before you pay.
      </p>
    </div>
  );
}

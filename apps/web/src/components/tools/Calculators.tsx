'use client';

import { useState } from 'react';
import { LOAN_DEFAULTS, affordability, buyingCosts, loanPlan, type CityCosts } from '@/lib/finance';
import { price as short } from '@/lib/format';

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const num = (v: string, fallback = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; };

function NumberField({ label, value, onChange, step, min = 0, max, suffix, hint }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string; hint?: string }) {
  return (
    <label className="afield">
      <span>{label}{suffix && <em> ({suffix})</em>}</span>
      <input type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} min={min} max={max} step={step} onChange={(e) => onChange(num(e.target.value))} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** Home-loan instalment for a price. With `price` given (a property page) the price is fixed; otherwise the buyer types it. */
export function EmiCalculator({ price }: { price?: number }) {
  const [amount, setAmount] = useState(price ?? 10_000_000);
  const [downPct, setDownPct] = useState(LOAN_DEFAULTS.downPct);
  const [rate, setRate] = useState(LOAN_DEFAULTS.ratePct);
  const [years, setYears] = useState(LOAN_DEFAULTS.years);
  const p = loanPlan(amount, downPct, rate, years);
  return (
    <div className="calc">
      <div className="calc-inputs">
        {price == null && <NumberField label="Home price" suffix="₹" value={amount} step={100000} onChange={setAmount} hint={short(amount)} />}
        <NumberField label="Down payment" suffix="% of price" value={downPct} max={100} step={1} onChange={setDownPct} hint={rupees(p.downPayment)} />
        <NumberField label="Interest rate" suffix="% a year" value={rate} max={30} step={0.05} onChange={setRate} hint="An example rate. Use the rate your bank offers you." />
        <NumberField label="Loan period" suffix="years" value={years} min={1} max={30} step={1} onChange={setYears} />
      </div>
      <dl className="calc-result" aria-live="polite">
        <div className="big"><dt>Monthly EMI</dt><dd>{rupees(p.monthly)}</dd></div>
        <div><dt>Loan amount</dt><dd>{short(p.loan)}</dd></div>
        <div><dt>Interest over {years} years</dt><dd>{short(p.interest)}</dd></div>
        <div><dt>Total you repay</dt><dd>{short(p.totalPaid)}</dd></div>
      </dl>
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
        <NumberField label="Household take-home pay" suffix="₹ a month" value={income} step={5000} onChange={setIncome} />
        <NumberField label="Other loan EMIs" suffix="₹ a month" value={other} step={1000} onChange={setOther} hint="Car, personal or education loans you already repay." />
        <NumberField label="Savings for the down payment" suffix="₹" value={savings} step={50000} onChange={setSavings} hint={short(savings)} />
        <NumberField label="Interest rate" suffix="% a year" value={rate} max={30} step={0.05} onChange={setRate} hint="An example rate. Use the rate your bank offers you." />
        <NumberField label="Loan period" suffix="years" value={years} min={1} max={30} step={1} onChange={setYears} />
        <NumberField label="Share of pay for all EMIs" suffix="%" value={share} min={10} max={70} step={1} onChange={setShare} hint="Lenders commonly allow 40–50%." />
      </div>
      <dl className="calc-result" aria-live="polite">
        <div className="big"><dt>Home budget</dt><dd>{short(a.budget)}</dd></div>
        <div><dt>Loan you could repay</dt><dd>{short(a.loan)}</dd></div>
        <div><dt>EMI you could carry</dt><dd>{rupees(a.spare)}</dd></div>
        <div><dt>From your savings</dt><dd>{short(savings)}</dd></div>
      </dl>
      {a.spare === 0 && <p className="calc-note">Your existing EMIs already use the whole share of pay a lender would allow, so the budget is your savings alone.</p>}
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
  return (
    <div className="calc">
      <div className="calc-inputs">
        {price == null && <NumberField label="Home price" suffix="₹" value={amount} step={100000} onChange={setAmount} hint={short(amount)} />}
        {!costs && (
          <label className="afield"><span>City</span>
            <select value={citySlug} onChange={(e) => setCitySlug(e.target.value)}>{usable.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
          </label>
        )}
        {underConstruction == null && (
          <label className="afield"><span>The home is</span>
            <select value={building ? 'uc' : 'ready'} onChange={(e) => setBuilding(e.target.value === 'uc')}><option value="ready">Ready to move</option><option value="uc">Under construction</option></select>
          </label>
        )}
        <label className="acheck"><input type="checkbox" checked={woman} onChange={(e) => setWoman(e.target.checked)} /> <span>The home will be in a woman’s name alone{concession ? ` (stamp duty ${rule.stampDutyWomenPct}% instead of ${rule.stampDutyPct}% in ${place})` : ` (no lower rate in ${place})`}</span></label>
      </div>
      <dl className="calc-result" aria-live="polite">
        <div className="big"><dt>Total cost to buy</dt><dd>{short(b.total)}</dd></div>
        <div><dt>Listed price</dt><dd>{short(amount)}</dd></div>
        <div><dt>Stamp duty ({b.stampDutyPct}%)</dt><dd>{rupees(b.stampDuty)}</dd></div>
        <div><dt>Registration fee</dt><dd>{rupees(b.registration)}</dd></div>
        <div><dt>GST {building ? `(${b.gstPct}%, under construction)` : '(none on a ready home)'}</dt><dd>{rupees(b.gst)}</dd></div>
        <div><dt>Charges on top of the price</dt><dd>{short(b.charges)}</dd></div>
      </dl>
      <p className="calc-note">
        An estimate for {place}, not a quote. {rule.note} It leaves out the lawyer, brokerage, society transfer fees, loan processing and interiors.{' '}
        {rule.reviewedAt ? `Rates last checked by our team on ${new Date(rule.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}.` : 'These rates have not yet been checked by our team against the official schedule.'}{' '}
        Confirm the exact amount with the sub-registrar’s office or your lawyer before you pay.
      </p>
    </div>
  );
}

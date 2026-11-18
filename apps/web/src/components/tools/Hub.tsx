'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LOAN_DEFAULTS, loanPlan } from '@/lib/finance';
import { price as short } from '@/lib/format';
import { comparePath } from '@/lib/seo';
import { SliderField } from './Calculators';

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** One slider, three quick answers. Each answer opens the full tool for the detail. */
export function QuickLook() {
  const [amount, setAmount] = useState(10_000_000);
  const p = loanPlan(amount, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years);
  const payNeeded = (p.monthly * 100) / LOAN_DEFAULTS.incomeSharePct;
  return (
    <section className="quick" aria-label="A quick look at a price">
      <div className="quick-in">
        <h2>Pick a price. See what it means.</h2>
        <SliderField
          label="Home price" suffix="₹" value={amount} onChange={setAmount} min={1_000_000} max={50_000_000} step={100_000} hint={short(amount)}
          presets={[{ label: '₹50 L', value: 5_000_000 }, { label: '₹1 Cr', value: 10_000_000 }, { label: '₹2 Cr', value: 20_000_000 }, { label: '₹5 Cr', value: 50_000_000 }]}
        />
      </div>
      <ul className="quick-out" aria-live="polite">
        <li><Link href="/tools/emi-calculator"><span>Monthly EMI</span><strong>{rupees(p.monthly)}</strong><small>Change the rate and period →</small></Link></li>
        <li><Link href="/tools/home-affordability"><span>Take-home pay you would need</span><strong>{rupees(payNeeded)}</strong><small>a month. Work out your own budget →</small></Link></li>
        <li><Link href="/tools/cost-of-buying"><span>Down payment</span><strong>{short(p.downPayment)}</strong><small>plus stamp duty and fees. See them →</small></Link></li>
      </ul>
      <p className="calc-note">Worked out with {LOAN_DEFAULTS.downPct}% down, an example rate of {LOAN_DEFAULTS.ratePct}% over {LOAN_DEFAULTS.years} years, and EMIs taking {LOAN_DEFAULTS.incomeSharePct}% of pay. Every tool lets you change these.</p>
    </section>
  );
}

interface CityOption { slug: string; name: string; localities: { slug: string; name: string }[] }

/** Choose a city and two of its localities, and open their side-by-side page. */
export function LocalityPicker({ cities }: { cities: CityOption[] }) {
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) return null;
  const ready = a && b && a !== b;
  const name = (slug: string) => city.localities.find((l) => l.slug === slug)?.name;
  return (
    <section className="vs">
      <h2>Compare two localities</h2>
      <div className="picks" role="group" aria-label="City">
        {cities.map((c) => <button key={c.slug} type="button" className="pick" aria-pressed={c.slug === citySlug} onClick={() => { setCitySlug(c.slug); setA(''); setB(''); }}>{c.name}</button>)}
      </div>
      <div className="vs-row">
        <label className="afield"><span>First locality</span>
          <select value={a} onChange={(e) => setA(e.target.value)}><option value="">Choose…</option>{city.localities.filter((l) => l.slug !== b).map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}</select>
        </label>
        <span className="vs-mark" aria-hidden="true">vs</span>
        <label className="afield"><span>Second locality</span>
          <select value={b} onChange={(e) => setB(e.target.value)}><option value="">Choose…</option>{city.localities.filter((l) => l.slug !== a).map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}</select>
        </label>
        {ready
          ? <Link className="abtn" href={comparePath(city.slug, a, b)}>Compare {name(a)} and {name(b)}</Link>
          : <span className="abtn is-off" aria-disabled="true">Choose two localities</span>}
      </div>
    </section>
  );
}

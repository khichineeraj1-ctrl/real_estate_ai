'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LOAN_DEFAULTS, loanPlan } from '@/lib/finance';
import { price as short } from '@/lib/format';

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const MIN = 1_000_000; const MAX = 50_000_000; const STEP = 100_000;
const PRESETS = [5_000_000, 10_000_000, 20_000_000, 50_000_000];

/** One slider, three quick answers. Each answer opens the full tool for the detail. */
export function QuickLook() {
  const [amount, setAmount] = useState(10_000_000);
  const p = loanPlan(amount, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years);
  const payNeeded = (p.monthly * 100) / LOAN_DEFAULTS.incomeSharePct;
  const fill = ((amount - MIN) / (MAX - MIN)) * 100;
  const down = LOAN_DEFAULTS.downPct;
  return (
    <section className="quick" aria-label="A quick look at a price">
      <div className="quick-in">
        <p className="quick-label">Home price</p>
        <p className="quick-price" aria-live="polite">{short(amount)}</p>
        <input
          className="quick-slider" type="range" aria-label="Home price" aria-valuetext={short(amount)} min={MIN} max={MAX} step={STEP} value={amount}
          style={{ '--fill': `${fill}%` } as React.CSSProperties} onChange={(e) => setAmount(Number(e.target.value))}
        />
        <div className="picks">
          {PRESETS.map((v) => <button key={v} type="button" className="pick" aria-pressed={amount === v} onClick={() => setAmount(v)}>{short(v)}</button>)}
        </div>
        <div className="quick-split" role="img" aria-label={`Loan ${short(p.loan)}, down payment ${short(p.downPayment)}`}>
          <div className="quick-bar"><i style={{ flexGrow: 100 - down }} className="s1" /><i style={{ flexGrow: down }} className="s2" /></div>
          <p><span><i className="key s1" />Loan <strong>{short(p.loan)}</strong></span><span><i className="key s2" />Down payment <strong>{short(p.downPayment)}</strong></span></p>
        </div>
      </div>
      <ul className="quick-out" aria-live="polite">
        <li><Link href="/tools/emi-calculator"><span className="quick-ico" aria-hidden="true">📅</span><span>Monthly EMI</span><strong>{rupees(p.monthly)}</strong><b aria-hidden="true">→</b></Link></li>
        <li><Link href="/tools/home-affordability"><span className="quick-ico" aria-hidden="true">💼</span><span>Monthly pay needed</span><strong>{rupees(payNeeded)}</strong><b aria-hidden="true">→</b></Link></li>
        <li><Link href="/tools/cost-of-buying"><span className="quick-ico" aria-hidden="true">🧾</span><span>Down payment, before stamp duty</span><strong>{short(p.downPayment)}</strong><b aria-hidden="true">→</b></Link></li>
      </ul>
      <p className="quick-note">{LOAN_DEFAULTS.downPct}% down · {LOAN_DEFAULTS.ratePct}% example rate · {LOAN_DEFAULTS.years} years · EMI at {LOAN_DEFAULTS.incomeSharePct}% of pay. Tap a card to change these.</p>
    </section>
  );
}

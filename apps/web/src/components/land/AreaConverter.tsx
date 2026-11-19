'use client';

import { useState } from 'react';

/** Units with one size everywhere in India, in square feet. The same table the listings use. */
const UNITS: [code: string, label: string, sqft: number, where: string][] = [
  ['acre', 'Acre', 43_560, 'Used across India'],
  ['hectare', 'Hectare', 107_639, 'Government records'],
  ['sqft', 'Square foot', 1, 'Plots and buildings'],
  ['sqyd', 'Square yard (gaj)', 9, 'Plots in north India'],
  ['sqm', 'Square metre', 10.7639, 'Records and approvals'],
  ['guntha', 'Guntha', 1_089, 'Maharashtra, Karnataka, Telangana'],
  ['cent', 'Cent', 435.6, 'Kerala, Tamil Nadu, Andhra Pradesh'],
  ['kanal', 'Kanal', 5_445, 'Punjab, Haryana, Himachal, J&K'],
  ['ground', 'Ground', 2_400, 'Tamil Nadu'],
];
const show = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-IN') : n >= 1 ? String(Number(n.toFixed(2))) : String(Number(n.toPrecision(3))));

export function AreaConverter() {
  const [value, setValue] = useState('1');
  const [unit, setUnit] = useState('acre');
  const n = Number(value);
  const sqft = Number.isFinite(n) && n > 0 ? n * UNITS.find((u) => u[0] === unit)![2] : 0;
  return (
    <div className="area-tool">
      <div className="area-in">
        <label className="afield"><span>Size</span><input type="number" inputMode="decimal" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Size" /></label>
        <label className="afield"><span>Unit</span><select value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      </div>
      <ul className="area-out" aria-live="polite">
        {UNITS.filter((u) => u[0] !== unit).map(([code, label, size, where]) => (
          <li key={code}><button type="button" onClick={() => { setValue(String(Number((sqft / size).toPrecision(8)))); setUnit(code); }} aria-label={`Switch to ${label}`}><strong>{sqft ? show(sqft / size) : '—'}</strong><span>{label}</span><small>{where}</small></button></li>
        ))}
      </ul>
      <div className="area-warn" role="note">
        <strong>Bigha, katha, biswa and marla are not here on purpose.</strong>
        <p>Their size changes from state to state, and sometimes from one district to the next: a bigha can be anywhere from under a fifth of an acre to more than half. If a seller quotes one of these, ask what one unit is in that village in square feet or acres, and get it in writing, before you compare prices.</p>
      </div>
    </div>
  );
}

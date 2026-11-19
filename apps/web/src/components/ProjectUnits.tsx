'use client';

import { useState } from 'react';
import { ConnectButton } from '@/components/ConnectButton';
import { num, price } from '@/lib/format';
import { media } from '@/lib/seo';
import type { ProjectUnit } from '@/lib/types';

const area = (u: ProjectUnit) => (u.carpetMaxSqft && u.carpetMaxSqft > u.carpetMinSqft ? `${num(u.carpetMinSqft)} to ${num(u.carpetMaxSqft)}` : num(u.carpetMinSqft));
const cost = (u: ProjectUnit) => (u.priceMinInr ? (u.priceMaxInr && u.priceMaxInr > u.priceMinInr ? `${price(u.priceMinInr)} to ${price(u.priceMaxInr)}` : `From ${price(u.priceMinInr)}`) : null);

/**
 * The homes a project offers: one tab per kind, each with its carpet area, price where the builder has given one, the
 * floor plan, and a button that asks for that kind's price. Every option is in the page's text, tab or not.
 */
export function ProjectUnits({ units, slug, name, unclaimed }: { units: ProjectUnit[]; slug: string; name: string; unclaimed: boolean }) {
  const [at, setAt] = useState(0);
  const [zoom, setZoom] = useState(false);
  const u = units[Math.min(at, units.length - 1)];
  const labels = units.map((x) => x.label);
  return (
    <div className="units">
      <div className="units-tabs" role="tablist" aria-label={`Homes in ${name}`}>
        {units.map((x, i) => (
          <button key={x.id} type="button" role="tab" id={`unit-tab-${i}`} aria-selected={i === at} aria-controls="unit-panel" className={i === at ? 'on' : ''} onClick={() => { setAt(i); setZoom(false); }}>
            <strong>{x.label}</strong><span>{area(x)} sq ft</span>
          </button>
        ))}
      </div>
      <div className="unit" role="tabpanel" id="unit-panel" aria-labelledby={`unit-tab-${at}`}>
        <div className="unit-facts">
          <h3>{u.label}</h3>
          <dl>
            <div><dt>Carpet area</dt><dd>{area(u)} sq ft</dd></div>
            <div><dt>Price</dt><dd>{cost(u) ?? 'On request'}</dd></div>
            {u.ratePerCarpetSqft && <div><dt>Per sq ft you can use</dt><dd>₹{num(u.ratePerCarpetSqft)}<small>starting price ÷ carpet area</small></dd></div>}
          </dl>
          <ConnectButton kind="project" slug={slug} name={name} mode="callback" unclaimed={unclaimed} full interests={labels} interest={u.label} label={cost(u) ? `Ask about the ${u.label}` : `Get the price of the ${u.label}`} />
        </div>
        {u.planFile
          ? <button type="button" className={`unit-plan ${zoom ? 'is-zoom' : ''}`} onClick={() => setZoom((z) => !z)} aria-label={`${zoom ? 'Shrink' : 'Enlarge'} the floor plan of the ${u.label}`}><img src={media(u.planFile, zoom ? 'full' : 'card')} alt={`Floor plan of the ${u.label} in ${name}`} loading="lazy" /><span>{zoom ? 'Tap to shrink' : 'Tap to enlarge'}</span></button>
          : <div className="unit-plan none"><span aria-hidden="true">📐</span><p>No floor plan yet. Ask for it with the price.</p></div>}
      </div>
      <p className="calc-note">Sizes and prices are as stated by the builder and can change; the agreement you sign is what counts. Carpet area is the floor you can actually use, inside the walls.</p>
    </div>
  );
}

/** Amenities in groups, with a picture each. The first eight show; the rest open on request. */
export function Amenities({ groups }: { groups: { group: string; items: { label: string; icon: string }[] }[] }) {
  const [all, setAll] = useState(false);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const top = groups.flatMap((g) => g.items).slice(0, 8);
  return (
    <div className="amen">
      {!all ? <ul className="amen-grid">{top.map((a) => <li key={a.label}><span aria-hidden="true">{a.icon}</span>{a.label}</li>)}</ul> : groups.map((g) => (
        <div key={g.group} className="amen-group"><h3>{g.group}</h3><ul className="amen-grid">{g.items.map((a) => <li key={a.label}><span aria-hidden="true">{a.icon}</span>{a.label}</li>)}</ul></div>
      ))}
      {total > 8 && <button type="button" className="abtn quiet" aria-expanded={all} onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show all ${total}, by group`}</button>}
      <p className="calc-note">As stated by the builder. Check that what matters to you is written into your agreement.</p>
    </div>
  );
}

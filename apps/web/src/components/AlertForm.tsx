'use client';

import { useActionState, useState } from 'react';
import { createAlert, type AlertState } from '@/app/(site)/actions';
import { useMe } from '@/lib/account';

const PRICES = [[5_000_000, '₹50 lakh'], [10_000_000, '₹1 crore'], [15_000_000, '₹1.5 crore'], [20_000_000, '₹2 crore'], [30_000_000, '₹3 crore'], [50_000_000, '₹5 crore']] as const;

/**
 * "Tell me when something new appears here": new projects on the register, or new homes for sale, in this city or
 * locality. A signed-in buyer needs no email box; anyone else gives one and agrees to be written to.
 */
export function AlertForm({ city, locality, place }: { city: string; locality?: string; place: string }) {
  const [state, run, pending] = useActionState<AlertState, FormData>(createAlert, {});
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'PROJECTS' | 'HOMES'>('PROJECTS');
  const [bhk, setBhk] = useState('');
  if (state.label != null) return <p className="follow is-done" role="status"><span aria-hidden="true">🔔</span> Alert set{state.label ? `: ${state.label}` : ''}. We will email you only when there is something new.</p>;
  return (
    <div className="follow alert-form">
      <span aria-hidden="true" className="follow-bell">🔔</span>
      <div className="follow-text"><strong>Be the first to know in {place}</strong><span>An email when a new project is registered or a new home is listed here. Nothing else.</span></div>
      {!open ? <button type="button" className="abtn quiet" onClick={() => setOpen(true)}>Set an alert</button> : (
        <form action={run} className="alert-fields">
          {state.error && <p role="alert" className="aerror">{state.error}</p>}
          <input type="hidden" name="city" value={city} />{locality && <input type="hidden" name="locality" value={locality} />}
          <input type="hidden" name="kind" value={kind} /><input type="hidden" name="bhk" value={bhk} />
          <div className="picks" role="group" aria-label="Tell me about">
            <button type="button" className="pick" aria-pressed={kind === 'PROJECTS'} onClick={() => setKind('PROJECTS')}>🏗️ New projects</button>
            <button type="button" className="pick" aria-pressed={kind === 'HOMES'} onClick={() => setKind('HOMES')}>🏠 New homes for sale</button>
          </div>
          {kind === 'HOMES' && (
            <div className="alert-homes">
              <div className="picks" role="group" aria-label="Bedrooms">
                {['', '1', '2', '3', '4'].map((n) => <button key={n} type="button" className="pick" aria-pressed={bhk === n} onClick={() => setBhk(n)}>{n ? `${n} BHK` : 'Any size'}</button>)}
              </div>
              <label className="alert-price"><span>Up to</span>
                <select name="maxPrice" defaultValue=""><option value="">any price</option>{PRICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
            </div>
          )}
          <div className="alert-send">
            {!me?.signedIn && <input type="email" name="email" required autoComplete="email" placeholder="Your email" aria-label="Your email" />}
            <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            <button type="submit" className="abtn" disabled={pending}>{pending ? 'Saving…' : 'Set alert'}</button>
          </div>
          {me?.signedIn
            ? <p className="follow-consent">We will write to {me.email}. Every email has a link to stop.</p>
            : <label className="follow-consent"><input type="checkbox" name="consent" required /> <span>Email me when there is something new here. Every email has a link to stop.</span></label>}
        </form>
      )}
    </div>
  );
}

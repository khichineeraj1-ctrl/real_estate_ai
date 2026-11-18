'use client';

import { noteCompared } from '@/lib/intent';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';

/** The buyer's shortlist for side-by-side comparison. Kept in this browser only; nothing is sent anywhere until they open the comparison. */
const KEY = 'compare-homes';
const MAX = 4;
const EVENT = 'compare-homes-changed';
interface Pick { slug: string; title: string }

function read(): Pick[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is Pick => typeof x?.slug === 'string' && typeof x?.title === 'string').slice(0, MAX) : [];
  } catch {
    return []; // private browsing, or storage switched off: the shortlist simply stays empty
  }
}
function write(picks: Pick[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(picks)); } catch { /* nothing to do */ }
  cache = null;
  window.dispatchEvent(new Event(EVENT));
}

// useSyncExternalStore needs the same array back until something changes.
let cache: Pick[] | null = null;
const snapshot = () => (cache ??= read());
const EMPTY: Pick[] = [];
function subscribe(onChange: () => void) {
  const changed = () => { cache = null; onChange(); };
  window.addEventListener(EVENT, changed);
  window.addEventListener('storage', changed);
  return () => { window.removeEventListener(EVENT, changed); window.removeEventListener('storage', changed); };
}
const usePicks = () => useSyncExternalStore(subscribe, snapshot, () => EMPTY);

export function CompareToggle({ slug, title }: Pick) {
  const picks = usePicks();
  const chosen = picks.some((p) => p.slug === slug);
  const full = !chosen && picks.length >= MAX;
  return (
    <button
      type="button" className={`compare-toggle ${chosen ? 'on' : ''}`} aria-pressed={chosen} disabled={full}
      title={full ? `You can compare up to ${MAX} homes. Remove one first.` : undefined}
      onClick={() => { if (!chosen) noteCompared(); write(chosen ? picks.filter((p) => p.slug !== slug) : [...picks, { slug, title }]); }}
    >
      {chosen ? '✓ In comparison' : full ? 'Comparison is full' : '+ Compare'}
    </button>
  );
}

/** A bar at the bottom of the screen once at least one home is shortlisted. */
export function CompareBar() {
  const picks = usePicks();
  if (picks.length === 0) return null;
  return (
    <aside className="compare-bar" aria-label="Homes chosen to compare">
      <span>{picks.length} of {MAX} {picks.length === 1 ? 'home' : 'homes'} chosen</span>
      {picks.length > 1
        ? <Link className="abtn" href={`/compare?ids=${picks.map((p) => p.slug).join(',')}`}>Compare</Link>
        : <span className="compare-hint">Add one more to compare</span>}
      <button type="button" className="alink" onClick={() => write([])}>Clear</button>
    </aside>
  );
}

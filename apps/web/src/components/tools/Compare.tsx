'use client';

import { noteCompared } from '@/lib/intent';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

/**
 * The buyer's shortlists for side-by-side comparison: one of homes, one of builder projects. Kept in this browser
 * only; nothing is sent anywhere until they open a comparison.
 */
export type Kind = 'homes' | 'projects';
const MAX = 4;
export const MAX_COMPARE = MAX;
const EVENT = 'compare-changed';
const KEY: Record<Kind, string> = { homes: 'compare-homes', projects: 'compare-projects' };
const WORD: Record<Kind, [string, string]> = { homes: ['home', 'homes'], projects: ['project', 'projects'] };
export const comparePage = (kind: Kind, slugs: string[]) => `${kind === 'projects' ? '/compare/projects' : '/compare'}?ids=${slugs.join(',')}`;
/** `sub` and `image` are remembered when the picker knows them, so the board can show more than a name. */
export interface Pick { slug: string; title: string; sub?: string; image?: string }

function read(kind: Kind): Pick[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY[kind]) ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is Pick => typeof x?.slug === 'string' && typeof x?.title === 'string').slice(0, MAX) : [];
  } catch {
    return []; // private browsing, or storage switched off: the shortlist simply stays empty
  }
}
function write(kind: Kind, picks: Pick[]) {
  try { window.localStorage.setItem(KEY[kind], JSON.stringify(picks)); } catch { /* nothing to do */ }
  cache[kind] = null;
  window.dispatchEvent(new Event(EVENT));
}

// useSyncExternalStore needs the same array back until something changes.
const cache: Record<Kind, Pick[] | null> = { homes: null, projects: null };
const EMPTY: Pick[] = [];
function subscribe(onChange: () => void) {
  const changed = () => { cache.homes = null; cache.projects = null; onChange(); };
  window.addEventListener(EVENT, changed);
  window.addEventListener('storage', changed);
  return () => { window.removeEventListener(EVENT, changed); window.removeEventListener('storage', changed); };
}
export const setPicks = (kind: Kind, picks: Pick[]) => write(kind, picks.slice(0, MAX));
export const usePicks = (kind: Kind) => useSyncExternalStore(subscribe, () => (cache[kind] ??= read(kind)), () => EMPTY);

export function CompareToggle({ slug, title, kind = 'homes' }: Pick & { kind?: Kind }) {
  const picks = usePicks(kind);
  const chosen = picks.some((p) => p.slug === slug);
  const full = !chosen && picks.length >= MAX;
  return (
    <button
      type="button" className={`compare-toggle ${chosen ? 'on' : ''}`} aria-pressed={chosen} disabled={full}
      title={full ? `You can compare up to ${MAX} ${WORD[kind][1]}. Remove one first.` : `Put ${title} side by side with others`}
      onClick={() => {
        // Read the shortlist as it is now, not as it was when this button was drawn, so two quick taps both count.
        const now = read(kind);
        const has = now.some((p) => p.slug === slug);
        if (!has && now.length >= MAX) return;
        if (!has) noteCompared();
        write(kind, has ? now.filter((p) => p.slug !== slug) : [...now, { slug, title }]);
      }}
    >
      {chosen ? '✓ In comparison' : full ? 'Comparison is full' : '⇄ Compare'}
    </button>
  );
}

function Row({ kind }: { kind: Kind }) {
  const picks = usePicks(kind);
  if (picks.length === 0) return null;
  const [one, many] = WORD[kind];
  return (
    <div className="compare-row">
      <span className="compare-count"><strong>{picks.length}</strong> of {MAX} {picks.length === 1 ? one : many}</span>
      <ul className="compare-picks">
        {picks.map((p) => (
          <li key={p.slug}><span>{p.title}</span><button type="button" aria-label={`Remove ${p.title} from the comparison`} onClick={() => write(kind, read(kind).filter((x) => x.slug !== p.slug))}>×</button></li>
        ))}
      </ul>
      {picks.length > 1
        ? <Link className="abtn" href={comparePage(kind, picks.map((p) => p.slug))}>Compare {picks.length} {many}</Link>
        : <span className="compare-hint">Add one more {one} to compare</span>}
      <button type="button" className="alink" onClick={() => write(kind, [])}>Clear</button>
    </div>
  );
}

/** A bar at the bottom of the screen once something is shortlisted, naming what is in it. */
export function CompareBar() {
  const any = usePicks('homes').length + usePicks('projects').length;
  const path = usePathname();
  // The compare pages show the shortlist themselves.
  if (!any || path.startsWith('/compare')) return null;
  return (
    <aside className="compare-bar" aria-label="Chosen to compare">
      <Row kind="projects" />
      <Row kind="homes" />
    </aside>
  );
}

/** The same shortlists, shown on the compare page for a buyer who arrives there without a comparison open. */
export function Shortlists() {
  const homes = usePicks('homes'); const projects = usePicks('projects');
  if (!homes.length && !projects.length) return <p className="empty">Your shortlist is empty. Press “⇄ Compare” on any project or home and it will appear here.</p>;
  return <div className="compare-inline"><Row kind="projects" /><Row kind="homes" /></div>;
}

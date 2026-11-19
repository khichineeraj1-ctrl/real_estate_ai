'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { noteCompared } from '@/lib/intent';
import { comparePath, media } from '@/lib/seo';
import { MAX_COMPARE, comparePage, setPicks, usePicks, type Kind, type Pick } from './Compare';

interface City { slug: string; name: string; localities: { slug: string; name: string }[] }
interface Hit { slug: string; name: string; brand?: { name: string } | null; builder: string; photos?: { file: string }[]; locality: { name: string }; city: { slug: string; name: string }; agents?: number }
type Tab = 'projects' | 'localities' | 'homes';

const TABS: { key: Tab; label: string; icon: string; shows: string[] }[] = [
  { key: 'projects', label: 'Projects', icon: '🏗️', shows: ['RERA standing', 'Builder’s other projects', 'Verified agents', 'Homes for sale'] },
  { key: 'localities', label: 'Localities', icon: '📍', shows: ['Asking rates', 'Homes by size', 'Registered projects', 'Known for'] },
  { key: 'homes', label: 'Homes', icon: '🏠', shows: ['Price', 'Rate against the area', 'Full cost with stamp duty', 'EMI'] },
];

/** One place on the board: something chosen, or an empty space waiting for a choice. */
function Slot({ pick, n, onRemove, hint }: { pick?: Pick; n: number; onRemove?: () => void; hint: string }) {
  if (!pick) return <li className="slot is-empty"><span className="slot-plus" aria-hidden="true">+</span><span>{n <= 2 ? hint : 'Optional'}</span></li>;
  return (
    <li className="slot is-full">
      {pick.image ? <img src={media(pick.image, 'card')} alt="" width={640} height={480} /> : <span className="slot-letter" aria-hidden="true">{pick.title.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase()}</span>}
      <strong>{pick.title}</strong>
      {pick.sub && <small>{pick.sub}</small>}
      {onRemove && <button type="button" className="slot-x" aria-label={`Remove ${pick.title}`} onClick={onRemove}>×</button>}
    </li>
  );
}

function Board({ picks, max, hint, onRemove, href, noun }: { picks: Pick[]; max: number; hint: string; onRemove: (slug: string) => void; href: string | null; noun: string }) {
  // Two places to begin with; a third and fourth appear as the earlier ones fill.
  const places = Math.min(max, Math.max(2, picks.length + 1));
  return (
    <div className="board">
      <ol className="slots" aria-label={`Chosen ${noun}`}>
        {Array.from({ length: places }, (_, i) => <Slot key={picks[i]?.slug ?? `empty-${i}`} pick={picks[i]} n={i + 1} hint={hint} onRemove={picks[i] ? () => onRemove(picks[i].slug) : undefined} />)}
      </ol>
      <div className="board-go">
        <div className="dots" aria-hidden="true">{Array.from({ length: max }, (_, i) => <i key={i} className={i < picks.length ? 'on' : ''} />)}</div>
        {href ? <Link className="abtn board-btn" href={href}>Compare {picks.length} {noun} →</Link> : <span className="abtn is-off board-btn" aria-disabled="true">{picks.length ? 'Add one more' : `Pick two ${noun}`}</span>}
      </div>
    </div>
  );
}

function Projects({ cities, show }: { cities: City[]; show: number }) {
  const picks = usePicks('projects');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const turn = useRef(0);
  useEffect(() => {
    const mine = ++turn.current;
    const t = setTimeout(() => {
      fetch(`/api/projects?q=${encodeURIComponent(q)}${city ? `&city=${city}` : ''}`).then((r) => r.json()).then((d: { items: Hit[] }) => { if (mine === turn.current) setHits(d.items.slice(0, show)); }).catch(() => { if (mine === turn.current) setHits([]); });
    }, q ? 220 : 0);
    return () => clearTimeout(t);
  }, [q, city, show]);
  const toggle = (h: Hit) => {
    const has = picks.some((p) => p.slug === h.slug);
    if (!has && picks.length >= MAX_COMPARE) return;
    if (!has) noteCompared();
    setPicks('projects', has ? picks.filter((p) => p.slug !== h.slug) : [...picks, { slug: h.slug, title: h.name, sub: `${h.locality.name}, ${h.city.name}`, image: h.photos?.[0]?.file }]);
  };
  const full = picks.length >= MAX_COMPARE;
  return (
    <>
      <Board picks={picks} max={MAX_COMPARE} hint="Pick a project" noun="projects" onRemove={(slug) => setPicks('projects', picks.filter((p) => p.slug !== slug))} href={picks.length > 1 ? comparePage('projects', picks.map((p) => p.slug)) : null} />
      <div className="finder">
        <label className="finder-box"><span aria-hidden="true">🔍</span><span className="sr">Search projects or builders</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a project or builder, e.g. M3M" autoComplete="off" />
        </label>
        <div className="picks" role="group" aria-label="City">
          <button type="button" className="pick" aria-pressed={city === ''} onClick={() => setCity('')}>All cities</button>
          {cities.map((c) => <button key={c.slug} type="button" className="pick" aria-pressed={city === c.slug} onClick={() => setCity(c.slug)}>{c.name}</button>)}
        </div>
      </div>
      <ul className="hits" aria-live="polite" aria-busy={hits === null}>
        {hits === null && Array.from({ length: 4 }, (_, i) => <li key={i} className="hit is-loading" aria-hidden="true" />)}
        {hits?.length === 0 && <li className="hits-none">No project matches “{q}”. Try the builder’s name.</li>}
        {hits?.map((h) => {
          const on = picks.some((p) => p.slug === h.slug);
          return (
            <li key={h.slug}>
              <button type="button" className={`hit ${on ? 'on' : ''}`} aria-pressed={on} disabled={!on && full} onClick={() => toggle(h)}>
                {h.photos?.[0] ? <img src={media(h.photos[0].file, 'card')} alt="" width={640} height={480} loading="lazy" /> : <span className="slot-letter" aria-hidden="true">{h.name.charAt(0).toUpperCase()}</span>}
                <span className="hit-text"><strong>{h.name}</strong><small>{h.brand?.name ?? h.builder} · {h.locality.name}, {h.city.name}</small></span>
                <span className="hit-add" aria-hidden="true">{on ? '✓' : '+'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Localities({ cities }: { cities: City[] }) {
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const [chosen, setChosen] = useState<string[]>([]);
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) return null;
  const picks: Pick[] = chosen.map((slug) => ({ slug, title: city.localities.find((l) => l.slug === slug)?.name ?? slug, sub: city.name }));
  // A third tap replaces the older of the two, so changing your mind is one tap.
  const tap = (slug: string) => setChosen((now) => (now.includes(slug) ? now.filter((s) => s !== slug) : [...now, slug].slice(-2)));
  return (
    <>
      <Board picks={picks} max={2} hint="Pick an area" noun="localities" onRemove={(slug) => setChosen((now) => now.filter((s) => s !== slug))} href={chosen.length === 2 ? comparePath(city.slug, chosen[0], chosen[1]) : null} />
      <div className="finder">
        <div className="picks" role="group" aria-label="City">
          {cities.map((c) => <button key={c.slug} type="button" className="pick" aria-pressed={c.slug === citySlug} onClick={() => { setCitySlug(c.slug); setChosen([]); }}>{c.name}</button>)}
        </div>
      </div>
      <div className="areas" role="group" aria-label={`Localities in ${city.name}`}>
        {city.localities.map((l) => <button key={l.slug} type="button" className="area" aria-pressed={chosen.includes(l.slug)} onClick={() => tap(l.slug)}><span aria-hidden="true">📍</span>{l.name}</button>)}
      </div>
    </>
  );
}

function Homes({ cities }: { cities: City[] }) {
  const picks = usePicks('homes');
  return (
    <>
      <Board picks={picks} max={MAX_COMPARE} hint="Pick a home" noun="homes" onRemove={(slug) => setPicks('homes', picks.filter((p) => p.slug !== slug))} href={picks.length > 1 ? comparePage('homes', picks.map((p) => p.slug)) : null} />
      <p className="finder-note">Tap “⇄ Compare” on any listing and it lands here.</p>
      <div className="areas">
        {cities.map((c) => <Link key={c.slug} className="area" href={`/${c.slug}`}><span aria-hidden="true">🏙️</span>Homes in {c.name}</Link>)}
      </div>
    </>
  );
}

/** The picker on the compare page and, with fewer suggestions (`compact`), the home page: choose what to compare, fill the board, and go. */
export function CompareStudio({ cities, compact = false }: { cities: City[]; compact?: boolean }) {
  const [tab, setTab] = useState<Tab>('projects');
  // Links such as /compare#localities open on that tab.
  useEffect(() => { const want = window.location.hash.slice(1); if (TABS.some((t) => t.key === want)) setTab(want as Tab); }, []);
  const counts: Record<Kind, number> = { projects: usePicks('projects').length, homes: usePicks('homes').length };
  const now = TABS.find((t) => t.key === tab)!;
  return (
    <section className="studio" aria-label="Choose what to compare">
      <div className="studio-tabs" role="tablist" aria-label="What to compare">
        {TABS.map((t) => {
          const n = t.key === 'localities' ? 0 : counts[t.key];
          return (
            <button key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls="studio-panel" className="studio-tab" onClick={() => setTab(t.key)}>
              <span aria-hidden="true">{t.icon}</span>{t.label}{n > 0 && <b aria-label={`${n} chosen`}>{n}</b>}
            </button>
          );
        })}
      </div>
      <div className="studio-panel" role="tabpanel" id="studio-panel" aria-labelledby={`tab-${tab}`} key={tab}>
        <ul className="shows" aria-label="What the comparison shows">{now.shows.map((s) => <li key={s}>{s}</li>)}</ul>
        {tab === 'projects' && <Projects cities={cities} show={compact ? 4 : 8} />}
        {tab === 'localities' && <Localities cities={cities} />}
        {tab === 'homes' && <Homes cities={cities} />}
      </div>
    </section>
  );
}

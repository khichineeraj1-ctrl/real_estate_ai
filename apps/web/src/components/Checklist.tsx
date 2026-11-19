'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CheckItem } from '@/lib/types';

const MARK = { good: '✓', warn: '!', info: 'i', none: '–' } as const;

/**
 * What to check before paying for a project. Each item opens to say why; the buyer ticks them off as they go, and
 * the ticks are remembered in this browser for this project.
 */
export function Checklist({ slug, name, items }: { slug: string; name: string; items: CheckItem[] }) {
  const key = `checked-${slug}`;
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(items.find((i) => i.tone === 'warn')?.key ?? items[0]?.key ?? null);
  useEffect(() => { try { const raw = JSON.parse(window.localStorage.getItem(key) ?? '[]'); if (Array.isArray(raw)) setDone(raw.filter((x) => typeof x === 'string')); } catch { /* storage off: ticks last for this visit */ } }, [key]);
  const toggle = (k: string) => setDone((now) => { const next = now.includes(k) ? now.filter((x) => x !== k) : [...now, k]; try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* nothing to do */ } return next; });
  const count = items.filter((i) => done.includes(i.key)).length;
  return (
    <section className="section checklist" id="before-you-pay" aria-label={`Before you pay for ${name}`}>
      <div className="checklist-head">
        <div><h2>Before you pay for {name}</h2><p>{items.length} things to check, ask for or refuse. Tick them off as you go.</p></div>
        <div className="checklist-progress" aria-live="polite"><strong>{count}</strong> of {items.length}<span><i style={{ width: `${(count / items.length) * 100}%` }} /></span></div>
      </div>
      <ol className="checks">
        {items.map((i) => {
          const ticked = done.includes(i.key); const shown = open === i.key;
          return (
            <li key={i.key} className={`check tone-${i.tone} ${ticked ? 'is-done' : ''}`}>
              <button type="button" className="check-box" role="checkbox" aria-checked={ticked} aria-label={`${ticked ? 'Untick' : 'Tick off'}: ${i.title}`} onClick={() => toggle(i.key)}>{ticked ? '✓' : ''}</button>
              <div className="check-body">
                <button type="button" className="check-title" aria-expanded={shown} onClick={() => setOpen(shown ? null : i.key)}>
                  <i aria-hidden="true">{MARK[i.tone]}</i><span>{i.title}</span><b aria-hidden="true">{shown ? '−' : '+'}</b>
                </button>
                {shown && (
                  <p>{i.why} {i.link && (i.link.href.startsWith('/') ? <Link href={i.link.href}>{i.link.label} →</Link> : <a href={i.link.href} target="_blank" rel="noopener noreferrer nofollow">{i.link.label} ↗</a>)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="calc-note">General guidance from what the RERA register shows for this project; it is not legal advice. Have the papers read by your own lawyer.</p>
    </section>
  );
}

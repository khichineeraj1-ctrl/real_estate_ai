'use client';

import { useEffect } from 'react';
import { loadMe } from '@/lib/account';

const COMPARE = { homes: 'compare-homes', projects: 'compare-projects' } as const;
const TICKS = 'checked-';
type Pick = { slug: string; title: string };
const read = <T,>(key: string, fallback: T): T => { try { const v = JSON.parse(window.localStorage.getItem(key) ?? 'null'); return v ?? fallback; } catch { return fallback; } };
const write = (key: string, v: unknown) => { try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage off */ } };

function local() {
  const ticks: Record<string, string[]> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(TICKS)) { const v = read<string[]>(k, []); if (Array.isArray(v) && v.length) ticks[k.slice(TICKS.length)] = v; }
    }
  } catch { /* storage off */ }
  return { ticks, compare: { homes: read<Pick[]>(COMPARE.homes, []), projects: read<Pick[]>(COMPARE.projects, []) } };
}

/**
 * For a signed-in buyer: brings the shortlists and checklist ticks kept on their account into this browser once, then
 * sends this browser's copy back whenever either changes. Signed out, it does nothing.
 */
export function AccountSync() {
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const push = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void fetch('/api/me/state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: local() }) }).catch(() => undefined); }, 800);
    };
    void loadMe().then((me) => {
      if (!live || !me.signedIn) return;
      const mine = local();
      const theirs = me.state ?? { ticks: {}, compare: { homes: [], projects: [] } };
      // Join the two: nothing ticked or shortlisted on either side is lost.
      for (const [slug, keys] of Object.entries(theirs.ticks)) write(`${TICKS}${slug}`, [...new Set([...(mine.ticks[slug] ?? []), ...keys])]);
      for (const kind of ['homes', 'projects'] as const) {
        const joined = [...mine.compare[kind]];
        for (const p of theirs.compare[kind]) if (!joined.some((x) => x.slug === p.slug)) joined.push(p);
        write(COMPARE[kind], joined.slice(0, 4));
      }
      window.dispatchEvent(new Event('compare-changed'));
      window.dispatchEvent(new Event('checklist-changed'));
      push();
      window.addEventListener('compare-changed', push);
      window.addEventListener('checklist-ticked', push);
    });
    return () => { live = false; clearTimeout(timer); window.removeEventListener('compare-changed', push); window.removeEventListener('checklist-ticked', push); };
  }, []);
  return null;
}

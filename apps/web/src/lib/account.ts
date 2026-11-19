'use client';

import { useSyncExternalStore } from 'react';

/**
 * What the browser knows about the visitor's account, fetched once per page load and shared by every save button.
 * Signed-out visitors cost one small request and nothing more.
 */
export interface Me { signedIn: boolean; email?: string; saved: { kind: 'project' | 'property'; slug: string; note: string | null }[]; state?: { ticks: Record<string, string[]>; compare: { homes: { slug: string; title: string }[]; projects: { slug: string; title: string }[] } } }
let me: Me | null = null;
let asked: Promise<Me> | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((l) => l());

export function loadMe(): Promise<Me> {
  asked ??= fetch('/api/me', { cache: 'no-store' }).then((r) => r.json()).then((d: Partial<Me>) => { me = { signedIn: !!d.signedIn, email: d.email, saved: d.saved ?? [], state: d.state }; tell(); return me; }).catch(() => { me = { signedIn: false, saved: [] }; tell(); return me; });
  return asked;
}
export function useMe(): Me | null {
  return useSyncExternalStore((l) => { listeners.add(l); void loadMe(); return () => { listeners.delete(l); }; }, () => me, () => null);
}

export async function setSaved(kind: 'project' | 'property', slug: string, on: boolean, note?: string): Promise<boolean> {
  const res = await fetch('/api/me/saved', { method: on ? 'POST' : 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, slug, note }) }).catch(() => null);
  if (!res?.ok || !me) return false;
  const rest = me.saved.filter((s) => !(s.kind === kind && s.slug === slug));
  me = { ...me, saved: on ? [...rest, { kind, slug, note: note ?? me.saved.find((s) => s.kind === kind && s.slug === slug)?.note ?? null }] : rest };
  tell();
  return true;
}

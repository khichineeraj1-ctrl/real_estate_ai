import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAlert, followProject, type BuilderRecord, type CheckItem } from '../lib/api';
import { useSession } from '../lib/session';
import { monthYear } from '../lib/format';
import { useTheme } from '../lib/theme';
import { toneOf } from './Insights';

const MARK = { good: '✓', warn: '!', info: 'i', none: '–' } as const;

/** A builder's registrations at a glance: a verdict, a bar split by where each stands, and the counts. */
export function TrackRecord({ name, place, r }: { name: string; place: string; r: BuilderRecord }) {
  const t = useTheme();
  if (!r.total) return null;
  const k = toneOf(t, r.verdict.tone);
  const parts = [
    { key: 'current', label: 'Being built', n: r.current, color: t.s1 },
    { key: 'ended', label: 'Past completion date', n: r.ended, color: t.s3 },
    { key: 'lapsed', label: 'Lapsed', n: r.lapsed, color: t.s2 },
    { key: 'unknown', label: 'No date on record', n: r.unknown, color: t.line },
  ].filter((x) => x.n > 0);
  return (
    <View style={[s.box, { backgroundColor: t.card, borderColor: t.line, borderLeftColor: k.ink, borderLeftWidth: 5 }]}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>{name}’s track record in {place}</Text>
      <Text style={{ color: t.muted, lineHeight: 20 }}><Text style={{ color: k.ink, fontWeight: '700' }}>{r.verdict.title}. </Text>{r.verdict.text}</Text>
      <View accessible accessibilityLabel={parts.map((x) => `${x.n} ${x.label.toLowerCase()}`).join(', ')} style={{ flexDirection: 'row', gap: 3, height: 12 }}>
        {parts.map((x) => <View key={x.key} style={{ flex: x.n, minWidth: 6, borderRadius: 5, backgroundColor: x.color }} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 }}>
        {parts.map((x) => <Text key={x.key} style={{ color: t.fg, fontSize: 13 }}><Text style={{ color: x.color }}>■ </Text><Text style={{ fontWeight: '700' }}>{x.n}</Text> {x.label}</Text>)}
      </View>
      {r.nextDue ? <Text style={{ color: t.muted, fontSize: 13 }}>Next due: <Text style={{ color: t.fg, fontWeight: '600' }}>{r.nextDue.name}, {monthYear(r.nextDue.date)}</Text></Text> : null}
      {r.lapsedNames.length ? <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}><Text style={{ color: t.fg, fontWeight: '600' }}>Marked lapsed: </Text>{r.lapsedNames.join(', ')}{r.lapsed > r.lapsedNames.length ? ` and ${r.lapsed - r.lapsedNames.length} more` : ''}.</Text> : null}
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>From the public RERA register. A record of registrations, not a rating.</Text>
    </View>
  );
}

// Ticks are kept while the app is open, one list per project.
const ticks: Record<string, string[]> = {};

/** What to check before paying for a project: tick items off, tap one to see why. */
export function Checklist({ slug, name, items }: { slug: string; name: string; items: CheckItem[] }) {
  const t = useTheme();
  const router = useRouter();
  const [done, setDone] = useState<string[]>(ticks[slug] ?? []);
  const [open, setOpen] = useState<string | null>(items.find((i) => i.tone === 'warn')?.key ?? items[0]?.key ?? null);
  const toggle = (key: string) => setDone((now) => (ticks[slug] = now.includes(key) ? now.filter((x) => x !== key) : [...now, key]));
  const count = items.filter((i) => done.includes(i.key)).length;
  return (
    <View style={[s.box, { backgroundColor: t.card, borderColor: t.line }]}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Before you pay for {name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ color: t.muted, fontSize: 13 }}><Text style={{ color: t.fg, fontWeight: '700' }}>{count}</Text> of {items.length} checked</Text>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: t.line, overflow: 'hidden' }}><View style={{ width: `${(count / items.length) * 100}%`, height: '100%', backgroundColor: t.ready }} /></View>
      </View>
      <View>
        {items.map((i) => {
          const ticked = done.includes(i.key); const shown = open === i.key; const k = toneOf(t, i.tone);
          return (
            <View key={i.key} style={[s.item, { borderColor: t.line }]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ticked }} accessibilityLabel={i.title} onPress={() => toggle(i.key)} hitSlop={6} style={[s.tick, { borderColor: ticked ? t.ready : t.line, backgroundColor: ticked ? t.ready : t.card }]}>
                <Text style={{ color: t.brandInk, fontWeight: '800', fontSize: 13 }}>{ticked ? '✓' : ''}</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: shown }} onPress={() => setOpen(shown ? null : i.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.mark, { backgroundColor: k.bg }]}><Text style={{ color: k.ink, fontSize: 10, fontWeight: '800' }}>{MARK[i.tone]}</Text></View>
                  <Text style={{ flex: 1, color: ticked ? t.muted : t.fg, fontWeight: '600', textDecorationLine: ticked ? 'line-through' : 'none' }}>{i.title}</Text>
                  <Text style={{ color: t.muted, fontSize: 17 }}>{shown ? '−' : '+'}</Text>
                </Pressable>
                {shown ? (
                  <View style={{ gap: 6, marginTop: 6 }}>
                    <Text style={{ color: t.muted, fontSize: 14, lineHeight: 20 }}>{i.why}</Text>
                    {i.link ? <Pressable accessibilityRole="link" onPress={() => (i.link!.href.startsWith('/') ? router.push(i.link!.href as never) : Linking.openURL(i.link!.href))}><Text style={{ color: t.brand, fontWeight: '600' }}>{i.link.label} {i.link.href.startsWith('/') ? '→' : '↗'}</Text></Pressable> : null}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>General guidance from what the RERA register shows; not legal advice.</Text>
    </View>
  );
}

/** "Get told if this changes": an email box. We write only when the registration changes. */
export function Follow({ slug, name }: { slug: string; name: string }) {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const send = () => { setState('busy'); setError(''); followProject(slug, email.trim()).then(() => setState('done')).catch((e: Error) => { setError(e.message); setState('idle'); }); };
  if (state === 'done') return <View style={[s.box, { backgroundColor: t.readyBg, borderColor: t.ready }]}><Text style={{ color: t.ready, fontWeight: '600', lineHeight: 20 }}>🔔 You are following {name}. We will email you only if its registration changes.</Text></View>;
  return (
    <View style={[s.box, { backgroundColor: t.card, borderColor: t.line, borderStyle: 'dashed' }]}>
      <Text style={{ color: t.fg, fontWeight: '700', fontSize: 16 }}>🔔 Get told if this changes</Text>
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}>An email if {name}’s registration lapses, is extended or reaches its end date. Nothing else, and every email has a link to stop.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={email} onChangeText={setEmail} placeholder="Your email" placeholderTextColor={t.muted} accessibilityLabel="Your email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={{ flex: 1, borderWidth: 1, borderColor: t.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, color: t.fg, fontSize: 15, backgroundColor: t.card }} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ok || state === 'busy' }} disabled={!ok || state === 'busy'} onPress={send} style={{ borderRadius: 999, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: ok ? t.brand : t.line }}>
          <Text style={{ color: ok ? t.brandInk : t.muted, fontWeight: '700' }}>{state === 'busy' ? 'Saving…' : 'Follow'}</Text>
        </Pressable>
      </View>
      {error ? <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

const ALERT_PRICES: [number, string][] = [[0, 'Any price'], [10_000_000, '₹1 Cr'], [15_000_000, '₹1.5 Cr'], [20_000_000, '₹2 Cr'], [30_000_000, '₹3 Cr']];

/** "Be the first to know": an alert for new projects or new homes in a city or locality. */
export function AlertBox({ city, locality, place }: { city: string; locality?: string; place: string }) {
  const t = useTheme();
  const { signedIn, email: mine } = useSession();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'PROJECTS' | 'HOMES'>('PROJECTS');
  const [bhk, setBhk] = useState(0);
  const [max, setMax] = useState(0);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const ok = signedIn || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const send = () => { setBusy(true); setError(''); createAlert({ kind, city, locality, bhk: bhk || undefined, maxPrice: max || undefined, email: signedIn ? undefined : email.trim() }).then((r) => setDone(r.label)).catch((e: Error) => setError(e.message)).finally(() => setBusy(false)); };
  const chip = (on: boolean, label: string, onPress: () => void) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }}><Text style={{ color: on ? t.brandInk : t.fg, fontSize: 13, fontWeight: on ? '700' : '400' }}>{label}</Text></Pressable>;
  if (done != null) return <View style={[s.box, { backgroundColor: t.readyBg, borderColor: t.ready }]}><Text style={{ color: t.ready, fontWeight: '600', lineHeight: 20 }}>🔔 Alert set{done ? `: ${done}` : ''}. We will email you only when there is something new.</Text></View>;
  return (
    <View style={[s.box, { backgroundColor: t.card, borderColor: t.line, borderStyle: 'dashed' }]}>
      <Text style={{ color: t.fg, fontWeight: '700', fontSize: 16 }}>🔔 Be the first to know in {place}</Text>
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}>An email when a new project is registered or a new home is listed here. Nothing else.</Text>
      {!open ? <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start', borderWidth: 1.5, borderColor: t.brand, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}><Text style={{ color: t.brand, fontWeight: '700' }}>Set an alert</Text></Pressable> : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{chip(kind === 'PROJECTS', '🏗️ New projects', () => setKind('PROJECTS'))}{chip(kind === 'HOMES', '🏠 New homes', () => setKind('HOMES'))}</View>
          {kind === 'HOMES' ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[0, 1, 2, 3, 4].map((n) => chip(bhk === n, n ? `${n} BHK` : 'Any size', () => setBhk(n)))}</View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ALERT_PRICES.map(([v, l]) => chip(max === v, v ? `Up to ${l}` : l, () => setMax(v)))}</View>
            </>
          ) : null}
          {signedIn ? <Text style={{ color: t.muted, fontSize: 13 }}>We will write to {mine}.</Text> : (
            <TextInput value={email} onChangeText={setEmail} placeholder="Your email" placeholderTextColor={t.muted} accessibilityLabel="Your email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={{ borderWidth: 1, borderColor: t.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, color: t.fg, fontSize: 15, backgroundColor: t.card }} />
          )}
          {error ? <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ok || busy }} disabled={!ok || busy} onPress={send} style={{ borderRadius: 999, paddingVertical: 12, alignItems: 'center', backgroundColor: ok ? t.brand : t.line }}><Text style={{ color: ok ? t.brandInk : t.muted, fontWeight: '700' }}>{busy ? 'Saving…' : 'Set alert'}</Text></Pressable>
          <Text style={{ color: t.muted, fontSize: 12 }}>Every email has a link to stop.</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  tick: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

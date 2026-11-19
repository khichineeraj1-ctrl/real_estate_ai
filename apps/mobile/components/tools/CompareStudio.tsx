import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCities, photoUrl, searchProjects, type CitySummary, type ProjectHit } from '../../lib/api';
import { useTheme, type Theme } from '../../lib/theme';
import { MAX_COMPARE, setPicks, usePicks, type Pick } from './Compare';

type Tab = 'projects' | 'localities' | 'homes';
const TABS: { key: Tab; label: string; icon: string; shows: string[] }[] = [
  { key: 'projects', label: 'Projects', icon: '🏗️', shows: ['RERA standing', 'Builder’s other projects', 'Verified agents', 'Homes for sale'] },
  { key: 'localities', label: 'Localities', icon: '📍', shows: ['Asking rates', 'Homes by size', 'Registered projects', 'Known for'] },
  { key: 'homes', label: 'Homes', icon: '🏠', shows: ['Price', 'Rate against the area', 'Full cost', 'EMI'] },
];

function Letter({ title, t, size }: { title: string; t: Theme; size: number }) {
  return <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.brandInk, fontSize: size / 2.4, fontWeight: '700' }}>{title.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase()}</Text></View>;
}

/** One place on the board: something chosen (it pops in), or an empty space waiting for a choice. */
function Slot({ pick, hint, onRemove, t }: { pick?: Pick; hint: string; onRemove?: () => void; t: Theme }) {
  const pop = useRef(new Animated.Value(pick ? 0.9 : 1)).current;
  useEffect(() => { if (pick) Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start(); }, [pick, pop]);
  if (!pick) {
    return (
      <View style={[s.slot, { borderStyle: 'dashed', borderColor: t.brand, opacity: 0.75 }]}>
        <View style={[s.plus, { backgroundColor: t.soft }]}><Text style={{ color: t.brand, fontSize: 22 }}>+</Text></View>
        <Text style={{ color: t.muted, fontSize: 13 }}>{hint}</Text>
      </View>
    );
  }
  return (
    <Animated.View style={[s.slot, { borderColor: t.brand, backgroundColor: t.card, transform: [{ scale: pop }] }]}>
      {pick.image ? <Image source={{ uri: photoUrl(pick.image, 'card') }} style={s.slotImg} resizeMode="cover" /> : <View style={[s.slotImg, { backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: t.brandInk, fontSize: 26, fontWeight: '700' }}>{pick.title.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase()}</Text></View>}
      <Text numberOfLines={2} style={{ color: t.fg, fontWeight: '700', fontSize: 14, textAlign: 'center' }}>{pick.title}</Text>
      {pick.sub ? <Text numberOfLines={1} style={{ color: t.muted, fontSize: 12 }}>{pick.sub}</Text> : null}
      {onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${pick.title}`} onPress={onRemove} hitSlop={8} style={[s.x, { backgroundColor: t.card, borderColor: t.line }]}><Text style={{ color: t.muted, fontSize: 15, lineHeight: 17 }}>×</Text></Pressable> : null}
    </Animated.View>
  );
}

function Board({ picks, max, hint, noun, onRemove, onGo, t }: { picks: Pick[]; max: number; hint: string; noun: string; onRemove: (slug: string) => void; onGo: () => void; t: Theme }) {
  // Two places to begin with; a third and fourth appear as the earlier ones fill.
  const places = Math.min(max, Math.max(2, picks.length + 1));
  const ready = picks.length > 1;
  return (
    <View style={{ gap: 14 }}>
      <View style={s.slots}>
        {Array.from({ length: places }, (_, i) => (
          <View key={picks[i]?.slug ?? `empty-${i}`} style={s.place}>
            <Slot pick={picks[i]} hint={i < 2 ? hint : 'Optional'} onRemove={picks[i] ? () => onRemove(picks[i].slug) : undefined} t={t} />
            {i % 2 === 1 ? <View style={[s.vs, { backgroundColor: t.fg }]}><Text style={{ color: t.bg, fontSize: 10, fontWeight: '700' }}>VS</Text></View> : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>{Array.from({ length: max }, (_, i) => <View key={i} style={{ width: 18, height: 5, borderRadius: 3, backgroundColor: i < picks.length ? t.brand : t.line }} />)}</View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={onGo} style={[s.go, { backgroundColor: ready ? t.brand : t.line }]}>
          <Text style={{ color: ready ? t.brandInk : t.muted, fontWeight: '700', fontSize: 15 }}>{ready ? `Compare ${picks.length} ${noun} →` : picks.length ? 'Add one more' : `Pick two ${noun}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Chips({ items, value, onPick, t }: { items: { key: string; label: string }[]; value: string; onPick: (key: string) => void; t: Theme }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {items.map((c) => {
        const on = c.key === value;
        return <Pressable key={c.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onPick(c.key)} style={[s.chip, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }]}><Text style={{ color: on ? t.brandInk : t.fg, fontWeight: on ? '700' : '400', fontSize: 13 }}>{c.label}</Text></Pressable>;
      })}
    </ScrollView>
  );
}

function Projects({ cities, t }: { cities: CitySummary[]; t: Theme }) {
  const router = useRouter();
  const picks = usePicks('projects');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [hits, setHits] = useState<ProjectHit[] | null>(null);
  const turn = useRef(0);
  useEffect(() => {
    const mine = ++turn.current;
    const wait = setTimeout(() => {
      searchProjects(q, city || undefined).then((d) => { if (mine === turn.current) setHits(d.items); }).catch(() => { if (mine === turn.current) setHits([]); });
    }, q ? 220 : 0);
    return () => clearTimeout(wait);
  }, [q, city]);
  const full = picks.length >= MAX_COMPARE;
  const toggle = (h: ProjectHit) => {
    const has = picks.some((p) => p.slug === h.slug);
    if (!has && full) return;
    setPicks('projects', has ? picks.filter((p) => p.slug !== h.slug) : [...picks, { slug: h.slug, title: h.name, sub: `${h.locality.name}, ${h.city.name}`, image: h.photos?.[0]?.file }]);
  };
  return (
    <>
      <Board picks={picks} max={MAX_COMPARE} hint="Pick a project" noun="projects" t={t} onRemove={(slug) => setPicks('projects', picks.filter((p) => p.slug !== slug))} onGo={() => router.push({ pathname: '/compare-projects', params: { ids: picks.map((p) => p.slug).join(',') } })} />
      <View style={[s.search, { borderColor: t.line, backgroundColor: t.card }]}>
        <Text>🔍</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="Search a project or builder, e.g. M3M" placeholderTextColor={t.muted} accessibilityLabel="Search projects or builders" autoCorrect={false} returnKeyType="search" style={{ flex: 1, color: t.fg, fontSize: 16, paddingVertical: 11 }} />
      </View>
      <Chips t={t} value={city} onPick={setCity} items={[{ key: '', label: 'All cities' }, ...cities.map((c) => ({ key: c.slug, label: c.name }))]} />
      <View style={{ gap: 8 }}>
        {hits === null ? [0, 1, 2].map((i) => <View key={i} style={[s.hit, { borderColor: t.line, backgroundColor: t.soft, height: 66 }]} />) : null}
        {hits?.length === 0 ? <Text style={{ color: t.muted, textAlign: 'center', padding: 12 }}>No project matches “{q}”. Try the builder’s name.</Text> : null}
        {hits?.map((h) => {
          const on = picks.some((p) => p.slug === h.slug);
          const off = !on && full;
          return (
            <Pressable key={h.slug} accessibilityRole="button" accessibilityState={{ selected: on, disabled: off }} accessibilityLabel={`${on ? 'Remove' : 'Add'} ${h.name}`} disabled={off} onPress={() => toggle(h)} style={({ pressed }) => [s.hit, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.soft : t.card, opacity: off ? 0.45 : pressed ? 0.8 : 1 }]}>
              {h.photos?.[0] ? <Image source={{ uri: photoUrl(h.photos[0].file, 'card') }} style={{ width: 48, height: 48, borderRadius: 10 }} /> : <Letter title={h.name} t={t} size={48} />}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: t.fg, fontWeight: '700' }}>{h.name}</Text>
                <Text numberOfLines={1} style={{ color: t.muted, fontSize: 12 }}>{h.brand?.name ?? h.builder} · {h.locality.name}, {h.city.name}</Text>
              </View>
              <View style={[s.add, { backgroundColor: on ? t.brand : t.soft }]}><Text style={{ color: on ? t.brandInk : t.brand, fontWeight: '700' }}>{on ? '✓' : '+'}</Text></View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Localities({ cities, t }: { cities: CitySummary[]; t: Theme }) {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const [chosen, setChosen] = useState<string[]>([]);
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) return null;
  const picks: Pick[] = chosen.map((slug) => ({ slug, title: city.localities.find((l) => l.slug === slug)?.name ?? slug, sub: city.name }));
  // A third tap replaces the older of the two, so changing your mind is one tap.
  const tap = (slug: string) => setChosen((now) => (now.includes(slug) ? now.filter((x) => x !== slug) : [...now, slug].slice(-2)));
  return (
    <>
      <Board picks={picks} max={2} hint="Pick an area" noun="localities" t={t} onRemove={(slug) => setChosen((now) => now.filter((x) => x !== slug))} onGo={() => router.push({ pathname: '/compare-localities/[city]/[pair]', params: { city: city.slug, pair: [...chosen].sort().join('-vs-') } })} />
      <Chips t={t} value={citySlug} onPick={(c) => { setCitySlug(c); setChosen([]); }} items={cities.map((c) => ({ key: c.slug, label: c.name }))} />
      <View style={s.areas}>
        {city.localities.map((l) => {
          const on = chosen.includes(l.slug);
          return <Pressable key={l.slug} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => tap(l.slug)} style={[s.area, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }]}><Text style={{ color: on ? t.brandInk : t.fg, fontWeight: on ? '700' : '400' }}>📍 {l.name}</Text></Pressable>;
        })}
      </View>
    </>
  );
}

function Homes({ cities, t }: { cities: CitySummary[]; t: Theme }) {
  const router = useRouter();
  const picks = usePicks('homes');
  return (
    <>
      <Board picks={picks} max={MAX_COMPARE} hint="Pick a home" noun="homes" t={t} onRemove={(slug) => setPicks('homes', picks.filter((p) => p.slug !== slug))} onGo={() => router.push({ pathname: '/compare', params: { ids: picks.map((p) => p.slug).join(',') } })} />
      <Text style={{ color: t.muted, textAlign: 'center', fontSize: 13 }}>Tap “⇄ Compare” on any listing and it lands here.</Text>
      <View style={s.areas}>
        {cities.map((c) => <Pressable key={c.slug} accessibilityRole="button" onPress={() => router.push('/browse')} style={[s.area, { borderColor: t.line, backgroundColor: t.card }]}><Text style={{ color: t.fg }}>🏙️ Homes in {c.name}</Text></Pressable>)}
      </View>
    </>
  );
}

/** The compare screen's picker: choose what to compare, fill the board, and go. */
export function CompareStudio({ start = 'projects' }: { start?: Tab }) {
  const t = useTheme();
  const [tab, setTab] = useState<Tab>(start);
  const [cities, setCities] = useState<CitySummary[]>([]);
  useEffect(() => { getCities().then(setCities).catch(() => setCities([])); }, []);
  const counts = { projects: usePicks('projects').length, homes: usePicks('homes').length, localities: 0 };
  const now = TABS.find((x) => x.key === tab)!;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 22, fontWeight: '700' }}>Compare before you decide</Text>
      <View style={[s.tabs, { backgroundColor: t.soft, borderColor: t.line }]} accessibilityRole="tablist">
        {TABS.map((x) => {
          const on = x.key === tab;
          return (
            <Pressable key={x.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(x.key)} style={[s.tab, on && { backgroundColor: t.card, borderColor: t.brand }]}>
              <Text style={{ fontSize: 18 }}>{x.icon}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ color: on ? t.fg : t.muted, fontWeight: '600', fontSize: 13 }}>{x.label}</Text>
                {counts[x.key] > 0 ? <View style={[s.count, { backgroundColor: t.brand }]}><Text style={{ color: t.brandInk, fontSize: 11, fontWeight: '700' }}>{counts[x.key]}</Text></View> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {now.shows.map((x) => <View key={x} style={[s.show, { borderColor: t.line }]}><Text style={{ color: t.muted, fontSize: 12 }}><Text style={{ color: t.ready, fontWeight: '700' }}>✓ </Text>{x}</Text></View>)}
      </View>
      {tab === 'projects' ? <Projects cities={cities} t={t} /> : tab === 'localities' ? <Localities key={cities.length} cities={cities} t={t} /> : <Homes cities={cities} t={t} />}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, padding: 6, borderRadius: 18, borderWidth: 1 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 9, borderRadius: 13, borderWidth: 1.5, borderColor: 'transparent' },
  count: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  show: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  place: { width: '50%', paddingHorizontal: 9 },
  slot: { minHeight: 138, borderWidth: 1.5, borderRadius: 16, padding: 10, gap: 3, alignItems: 'center', justifyContent: 'center' },
  slotImg: { width: '100%', height: 74, borderRadius: 10, marginBottom: 4 },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  x: { position: 'absolute', top: -9, right: -9, width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  vs: { position: 'absolute', left: -14, top: '50%', marginTop: -14, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  go: { borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  hit: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 8 },
  add: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  areas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  area: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9 },
});

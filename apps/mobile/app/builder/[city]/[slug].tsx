import { Cover } from '../../../components/Cover';
import { ConnectButton } from '../../../components/LeadForm';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getBuilder, photoUrl, type BuilderDetail } from '../../../lib/api';
import { monthYear } from '../../../lib/format';
import { useTheme } from '../../../lib/theme';

const count = (n: number) => `${n} ${n === 1 ? 'project' : 'projects'}`;
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** One builder's projects in one city, grouped by locality. */
export default function Builder() {
  const t = useTheme();
  const router = useRouter();
  const { city, slug } = useLocalSearchParams<{ city: string; slug: string }>();
  const [b, setB] = useState<BuilderDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setB(null); setError('');
    getBuilder(slug, city).then((r) => {
      // A builder merged into another: open the one it is now part of.
      if ('movedTo' in r) router.replace({ pathname: '/builder/[city]/[slug]', params: { city, slug: r.movedTo } }); else setB(r);
    }).catch((e: Error) => setError(e.message));
  }, [city, slug, router]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!b) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const cityName = b.cities.find((c) => c.slug === city)?.name ?? '';
  const groups = new Map<string, { name: string; slug: string; projects: BuilderDetail['projects'] }>();
  for (const p of b.projects) (groups.get(p.locality.slug) ?? groups.set(p.locality.slug, { ...p.locality, projects: [] }).get(p.locality.slug)!).projects.push(p);
  const byLocality = [...groups.values()].sort((x, y) => y.projects.length - x.projects.length || x.name.localeCompare(y.name));
  const otherNames = b.registeredAs.filter((n) => n !== b.name);
  const elsewhere = b.cities.filter((c) => c.slug !== city);
  const status = (p: BuilderDetail['projects'][number]) => (/lapsed/i.test(p.registerStatus ?? '') ? 'RERA registration lapsed' : p.registerValidUntil ? `RERA registration to ${monthYear(p.registerValidUntil)}` : p.reraId ? 'RERA registered' : '');
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Stack.Screen options={{ title: b.name }} />
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 22, fontWeight: '700', lineHeight: 28 }}>{b.name} projects in {cityName}</Text>
      <Text style={{ color: t.fg, lineHeight: 22 }}>
        {b.name} has {count(b.projects.length)} in {cityName} listed here, in {list(byLocality.map((g) => g.name))}.
        {otherNames.length > 0 ? ` ${otherNames.length === 1 ? 'They are registered under the company name' : 'They are registered under these company names:'} ${list(otherNames)}.` : ''}
      </Text>
      {b.projects.some((p) => p.registerSource) ? <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}>Project details come from the public RERA register and have not been confirmed by the builder. The register does not give prices.</Text> : null}

      {byLocality.map((g) => (
        <View key={g.slug} style={{ gap: 8 }}>
          <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/locality/[city]/[slug]', params: { city, slug: g.slug } })}>
            <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>{g.name} <Text style={{ color: t.brand, fontSize: 14, fontWeight: '600' }}>See the area ›</Text></Text>
          </Pressable>
          {g.projects.map((p) => (
            <View key={p.slug} style={[s.row, { borderColor: t.line, backgroundColor: t.card, flexDirection: 'column', alignItems: 'stretch' }]}>
              {p.photos?.[0] ? <Cover photo={p.photos[0]} label={`${p.name}: photo`} /> : null}
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/project/[slug]', params: { slug: p.slug } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: t.fg, fontWeight: '600' }}>{p.name}</Text>
                  <Text style={{ color: /lapsed/i.test(p.registerStatus ?? '') ? t.danger : t.muted, fontSize: 13 }}>{[status(p), p.homes > 0 ? `${p.homes} ${p.homes === 1 ? 'home' : 'homes'} for sale` : ''].filter(Boolean).join(' · ')}</Text>
                  {(p.agents ?? 0) > 0 ? <Text style={{ color: t.ready, fontSize: 13, fontWeight: '600' }}>✓ {p.agents === 1 ? 'A verified agent sells this' : `${p.agents} verified agents sell this`}</Text> : null}
                </View>
                <Text style={{ color: t.brand, fontSize: 20 }}>›</Text>
              </Pressable>
              <ConnectButton kind="project" slug={p.slug} name={p.name} mode={(p.agents ?? 0) > 0 ? 'agent' : 'callback'} agents={p.agents} unclaimed={!!p.registerSource} />
            </View>
          ))}
        </View>
      ))}

      {elsewhere.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>{b.name} in other cities</Text>
          <View style={s.chips}>
            {elsewhere.map((c) => (
              <Pressable key={c.slug} accessibilityRole="button" onPress={() => router.push({ pathname: '/builder/[city]/[slug]', params: { city: c.slug, slug: b.slug } })} style={[s.chip, { borderColor: t.line, backgroundColor: t.soft }]}>
                <Text style={{ color: t.fg }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/builders/[city]', params: { city } })} style={[s.all, { borderColor: t.brand }]}>
        <Text style={{ color: t.brand, fontWeight: '600' }}>All builders in {cityName}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  all: { borderWidth: 1, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
});

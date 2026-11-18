import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getLocality, type LocalityDetail } from '../../../lib/api';
import { num, price } from '../../../lib/format';
import { useTheme } from '../../../lib/theme';

const rate = (n: number | null) => (n == null ? '—' : `₹${num(n)}/sq ft`);

export default function CompareLocalities() {
  const t = useTheme();
  const router = useRouter();
  const { city, pair } = useLocalSearchParams<{ city: string; pair: string }>();
  const [both, setBoth] = useState<[LocalityDetail, LocalityDetail] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const parts = pair.split('-vs-');
    if (parts.length !== 2) { setError('That comparison could not be opened.'); return; }
    setBoth(null);
    Promise.all([getLocality(city, parts[0]), getLocality(city, parts[1])]).then(([a, b]) => setBoth([a, b])).catch((e: Error) => setError(e.message));
  }, [city, pair]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!both) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const [a, b] = both;
  const cheaper = a.stats.avgRate && b.stats.avgRate && a.stats.avgRate !== b.stats.avgRate ? (a.stats.avgRate < b.stats.avgRate ? a : b) : null;
  const dearer = cheaper === a ? b : a;
  const verdict = cheaper
    ? `${cheaper.name} is the cheaper of the two: its homes are asking ${rate(cheaper.stats.avgRate)} on average, ${Math.round(((dearer.stats.avgRate! - cheaper.stats.avgRate!) / dearer.stats.avgRate!) * 100)}% less than ${dearer.name} at ${rate(dearer.stats.avgRate)}.`
    : `${a.name} and ${b.name} are asking about the same on average, ${rate(a.stats.avgRate)}.`;
  const sizes = [...new Set(both.flatMap((l) => l.bhk.map((x) => x.bhk)))].sort((x, y) => x - y);
  const low = (x: number | null, y: number | null) => (x != null && y != null && x !== y ? Math.min(x, y) : null);
  const rows: { label: string; cells: string[]; best?: number | null; values?: (number | null)[] }[] = [
    { label: 'Average asking rate', cells: both.map((l) => rate(l.stats.avgRate)), values: both.map((l) => l.stats.avgRate), best: low(a.stats.avgRate, b.stats.avgRate) },
    { label: 'Prices start at', cells: both.map((l) => price(l.stats.minPrice)), values: both.map((l) => l.stats.minPrice), best: low(a.stats.minPrice, b.stats.minPrice) },
    { label: 'Most expensive home', cells: both.map((l) => price(l.stats.maxPrice)) },
    { label: 'Homes for sale', cells: both.map((l) => String(l.stats.count)) },
    ...sizes.map((n) => ({ label: `${n} BHK`, cells: both.map((l) => { const x = l.bhk.find((y) => y.bhk === n); return x ? `${x.count} from ${price(x.minPrice)}` : 'None listed'; }) })),
    { label: 'Known for', cells: both.map((l) => l.highlights.join('\n')) },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Stack.Screen options={{ title: `${a.name} vs ${b.name}` }} />
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 21, fontWeight: '700', lineHeight: 27 }}>{a.name} vs {b.name}, {a.city.name}</Text>
      <Text style={{ color: t.fg, fontSize: 16, lineHeight: 23 }}>{verdict}</Text>
      <View style={[s.table, { borderColor: t.line }]}>
        <View style={s.line}>
          {both.map((l) => <Text key={l.slug} style={[s.cell, { color: t.fg, fontWeight: '700', backgroundColor: t.soft }]}>{l.name}</Text>)}
        </View>
        {rows.map((r) => (
          <View key={r.label} style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.line }}>
            <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingTop: 8 }}>{r.label}</Text>
            <View style={s.line}>
              {r.cells.map((c, i) => {
                const isBest = r.best != null && r.values?.[i] === r.best;
                return <Text key={both[i].slug} accessibilityLabel={`${r.label}, ${both[i].name}: ${c}${isBest ? ', lower' : ''}`} style={[s.cell, { color: isBest ? t.ready : t.fg, fontWeight: isBest ? '700' : '400', backgroundColor: isBest ? t.readyBg : 'transparent' }]}>{c}</Text>;
              })}
            </View>
          </View>
        ))}
      </View>
      <View style={s.line}>
        {both.map((l) => (
          <Pressable key={l.slug} accessibilityRole="button" onPress={() => router.push({ pathname: '/locality/[city]/[slug]', params: { city, slug: l.slug } })} style={[s.button, { borderColor: t.brand }]}>
            <Text style={{ color: t.brand, fontWeight: '600', textAlign: 'center' }}>Homes in {l.name}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  table: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  line: { flexDirection: 'row', gap: 0 },
  cell: { flex: 1, padding: 10, fontSize: 15, lineHeight: 21 },
  button: { flex: 1, borderWidth: 1, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: 4 },
});

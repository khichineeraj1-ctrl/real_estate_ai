import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PropertyCard } from '../../components/PropertyCard';
import { getProperty, photoUrl, type PropertyDetail } from '../../lib/api';
import { num, price, statusLabel, typeLabel } from '../../lib/format';
import { useTheme } from '../../lib/theme';

export default function Property() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [p, setP] = useState<PropertyDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setP(null); getProperty(slug).then(setP).catch((e: Error) => setError(e.message)); }, [slug]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!p) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const rows: [string, string | null][] = [
    ['Type', typeLabel(p.type)], ['Bedrooms', p.bhk ? `${p.bhk} BHK` : null], ['Bathrooms', p.bathrooms ? String(p.bathrooms) : null], ['Area', `${num(p.areaSqft)} sq ft`],
    ['Floor', p.floor != null ? `${p.floor} of ${p.totalFloors}` : null], ['Facing', p.facing], ['Furnishing', p.furnishing], ['Status', statusLabel(p.status)],
    ['Project', p.project?.name ?? null], ['RERA number', p.project?.reraId ?? null],
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Stack.Screen options={{ title: p.title.split(' in ')[0] }} />
      {(p.photos?.length ?? 0) > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {p.photos.map((ph, i) => (
            <Image key={ph.file} source={{ uri: photoUrl(ph.file) }} accessibilityLabel={`Photo ${i + 1} of ${p.photos.length}`} style={[s.photo, { backgroundColor: t.soft }]} resizeMode="cover" accessibilityIgnoresInvertColors />
          ))}
        </ScrollView>
      )}
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 21, fontWeight: '700', lineHeight: 27 }}>{p.title}</Text>
      <View>
        <Text style={{ color: t.fg, fontSize: 28, fontWeight: '800' }}>{price(p.priceInr)}</Text>
        <Text style={{ color: t.muted }}>₹{num(Math.round(p.priceInr / p.areaSqft))}/sq ft · area average ₹{num(p.localityStats.avgRate)}/sq ft</Text>
      </View>
      <View style={[s.table, { borderColor: t.line }]}>
        {rows.filter((r) => r[1]).map(([k, v]) => (
          <View key={k} style={[s.row, { borderColor: t.line }]}><Text style={{ color: t.muted }}>{k}</Text><Text style={{ color: t.fg, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{v}</Text></View>
        ))}
      </View>
      <Text style={{ color: t.fg, fontSize: 16, lineHeight: 23 }}>{p.description}</Text>
      {p.amenities.length > 0 && <Text style={{ color: t.muted }}>{p.amenities.join(' · ')}</Text>}
      {p.similar.length > 0 && <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 8 }}>Similar homes in {p.locality.name}</Text>}
      {p.similar.map((x) => <PropertyCard key={x.slug} p={x} />)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  photo: { width: 300, height: 210, borderRadius: 14 },
  table: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
});

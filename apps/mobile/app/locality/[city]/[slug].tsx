import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { PropertyCard } from '../../../components/PropertyCard';
import { getListing, getLocality, type Listing, type LocalityDetail } from '../../../lib/api';
import { num, price } from '../../../lib/format';
import { useTheme } from '../../../lib/theme';

export default function Locality() {
  const t = useTheme();
  const { city, slug } = useLocalSearchParams<{ city: string; slug: string }>();
  const [data, setData] = useState<{ l: LocalityDetail; listing: Listing } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([getLocality(city, slug), getListing(city, slug)]).then(([l, listing]) => setData({ l, listing })).catch((e: Error) => setError(e.message));
  }, [city, slug]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!data) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const { l, listing } = data;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: l.name }} />
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 22, fontWeight: '700' }}>Property in {l.name}, {l.city.name}</Text>
      <Text style={{ color: t.muted }}>
        {l.stats.count} homes · {price(l.stats.minPrice)} – {price(l.stats.maxPrice)} · avg ₹{num(l.stats.avgRate)}/sq ft
      </Text>
      <View style={{ gap: 2 }}>{l.highlights.map((h) => <Text key={h} style={{ color: t.fg }}>• {h}</Text>)}</View>
      {listing.items.map((p) => <PropertyCard key={p.slug} p={p} />)}
    </ScrollView>
  );
}

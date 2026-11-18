import { ConnectButton } from '../../../components/LeadForm';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { PropertyCard } from '../../../components/PropertyCard';
import { getListing, getLocality, photoUrl, type Listing, type LocalityDetail } from '../../../lib/api';
import { num, price } from '../../../lib/format';
import { useTheme } from '../../../lib/theme';

export default function Locality() {
  const t = useTheme();
  const router = useRouter();
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
      {l.stats.count > 0 && (
        <Text style={{ color: t.muted }}>
          {l.stats.count} homes · {price(l.stats.minPrice)} – {price(l.stats.maxPrice)} · avg ₹{num(l.stats.avgRate)}/sq ft
        </Text>
      )}
      <View style={{ gap: 2 }}>{l.highlights.map((h) => <Text key={h} style={{ color: t.fg }}>• {h}</Text>)}</View>
      {l.nearby?.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={{ color: t.muted, fontWeight: '600' }}>Compare {l.name} with</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {l.nearby.map((n) => (
              <Pressable key={n.slug} accessibilityRole="button" accessibilityLabel={`Compare ${l.name} with ${n.name}`} onPress={() => router.push({ pathname: '/compare-localities/[city]/[pair]', params: { city, pair: [l.slug, n.slug].sort().join('-vs-') } })} style={{ borderWidth: 1, borderColor: t.line, backgroundColor: t.soft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: t.fg }}>{n.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {listing.items.map((p) => <PropertyCard key={p.slug} p={p} />)}
      {listing.items.length === 0 && (
        <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: t.line, backgroundColor: t.soft, borderRadius: 14, padding: 14 }}>
          <Text style={{ color: t.muted, lineHeight: 21 }}>No homes are listed in {l.name} yet. Prices appear here only when a real owner, agent or builder posts a home.</Text>
        </View>
      )}
      {l.projects?.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Projects in {l.name}</Text>
          {l.projects.map((p) => (
            <View key={p.slug} style={{ borderWidth: 1, borderColor: t.line, backgroundColor: t.card, borderRadius: 14, padding: 12, gap: 8 }}>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/project/[slug]', params: { slug: p.slug } })} style={({ pressed }) => ({ gap: 2, opacity: pressed ? 0.6 : 1 })}>
                {p.photos?.[0] ? <Image source={{ uri: photoUrl(p.photos[0].file, 'card') }} accessibilityLabel={`${p.name}: photo`} resizeMode="cover" style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: 10, backgroundColor: t.soft, marginBottom: 6 }} /> : null}
                <Text style={{ color: t.fg, fontWeight: '600' }}>{p.name}</Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>{p.brand?.name ?? p.builder}{p.registerSource ? ' · from the RERA register' : ''}</Text>
                {(p.agents ?? 0) > 0 ? <Text style={{ color: t.ready, fontSize: 13, fontWeight: '600' }}>✓ {p.agents === 1 ? 'A verified agent sells this' : `${p.agents} verified agents sell this`}</Text> : null}
              </Pressable>
              <ConnectButton kind="project" slug={p.slug} name={p.name} mode={(p.agents ?? 0) > 0 ? 'agent' : 'callback'} agents={p.agents} unclaimed={!!p.registerSource} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

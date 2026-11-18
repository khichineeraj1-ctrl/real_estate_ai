import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCities, type CitySummary } from '../lib/api';
import { price } from '../lib/format';
import { useTheme } from '../lib/theme';

export default function Browse() {
  const t = useTheme();
  const router = useRouter();
  const [cities, setCities] = useState<CitySummary[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getCities().then(setCities).catch((e: Error) => setError(e.message)); }, []);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!cities) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }}>
      {cities.map((c) => (
        <View key={c.slug} style={{ gap: 10 }}>
          <View>
            <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 20, fontWeight: '700' }}>{c.name}</Text>
            <Text style={{ color: t.muted }}>{c.stats.count ? `${c.stats.count} homes · from ${price(c.stats.minPrice)}` : `${c.localities.length} localities · no homes listed yet`}</Text>
          </View>
          <View style={s.chips}>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/builders/[city]', params: { city: c.slug } })} style={[s.chip, { borderColor: t.brand, backgroundColor: t.card }]}>
              <Text style={{ color: t.brand, fontSize: 15, fontWeight: '600' }}>Builders in {c.name} ›</Text>
            </Pressable>
            {c.localities.map((l) => (
              <Pressable key={l.slug} accessibilityRole="button" onPress={() => router.push({ pathname: '/locality/[city]/[slug]', params: { city: c.slug, slug: l.slug } })} style={[s.chip, { borderColor: t.line, backgroundColor: t.soft }]}>
                <Text style={{ color: t.fg, fontSize: 15 }}>{l.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
});

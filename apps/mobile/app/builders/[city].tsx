import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { getBuilders, type BuilderSummary } from '../../lib/api';
import { useTheme } from '../../lib/theme';

/** Every builder with projects in one city, A to Z, with a box to find one by name. */
export default function CityBuilders() {
  const t = useTheme();
  const router = useRouter();
  const { city } = useLocalSearchParams<{ city: string }>();
  const [all, setAll] = useState<BuilderSummary[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { getBuilders().then(setAll).catch((e: Error) => setError(e.message)); }, []);
  const here = useMemo(() => (all ?? []).filter((b) => b.cities.some((c) => c.slug === city)), [all, city]);
  const cityName = here[0]?.cities.find((c) => c.slug === city)?.name ?? '';
  const shown = useMemo(() => { const k = q.trim().toLowerCase(); return k ? here.filter((b) => b.name.toLowerCase().includes(k)) : here; }, [here, q]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!all) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  return (
    <FlatList
      data={shown} keyExtractor={(b) => b.slug} contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 4 }}>
          <Stack.Screen options={{ title: cityName ? `Builders in ${cityName}` : 'Builders' }} />
          <Text style={{ color: t.muted, lineHeight: 21 }}>{here.length} builders with projects{cityName ? ` in ${cityName}` : ''} on the public RERA register. Tap one to see its projects here.</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="Find a builder by name" placeholderTextColor={t.muted} accessibilityLabel="Find a builder by name" autoCorrect={false} style={{ borderWidth: 1, borderColor: t.line, backgroundColor: t.card, color: t.fg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 }} />
        </View>
      }
      ListEmptyComponent={<Text style={{ color: t.muted }}>{q ? `No builder matches “${q}”.` : 'No builders are listed here yet.'}</Text>}
      renderItem={({ item: b }) => (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/builder/[city]/[slug]', params: { city, slug: b.slug } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: pressed ? t.brand : t.line, backgroundColor: t.card, borderRadius: 14, padding: 12 })}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.fg, fontWeight: '600', fontSize: 16 }}>{b.name}</Text>
            {b.cities.length > 1 ? <Text style={{ color: t.muted, fontSize: 13 }}>Also in {b.cities.filter((c) => c.slug !== city).map((c) => c.name).join(', ')}</Text> : null}
          </View>
          <Text style={{ color: t.brand, fontSize: 20 }}>›</Text>
        </Pressable>
      )}
    />
  );
}

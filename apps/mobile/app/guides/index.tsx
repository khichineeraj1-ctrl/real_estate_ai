import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGuides, type GuideCard } from '../../lib/guides';
import { useTheme } from '../../lib/theme';

export default function Guides() {
  const t = useTheme();
  const router = useRouter();
  const [guides, setGuides] = useState<GuideCard[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getGuides().then(setGuides).catch((e: Error) => setError(e.message)); }, []);
  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!guides) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }}>Short, plain answers to the questions that cost buyers money.</Text>
      {guides.map((g) => (
        <Pressable key={g.slug} accessibilityRole="button" accessibilityLabel={`${g.short}. ${g.minutes} minute read`} onPress={() => router.push({ pathname: '/guides/[slug]', params: { slug: g.slug } })} style={({ pressed }) => [s.card, { borderColor: pressed ? t.brand : t.line, backgroundColor: t.card, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <View style={[s.icon, { backgroundColor: t.soft }]}><Text style={{ fontSize: 22 }}>{g.icon}</Text></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: t.fg, fontSize: 16, fontWeight: '700' }}>{g.short}</Text>
            <Text numberOfLines={2} style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>{g.summary}</Text>
            <Text style={{ color: t.brand, fontSize: 12, fontWeight: '600' }}>{g.minutes} min read</Text>
          </View>
          <Text style={{ color: t.brand, fontWeight: '700' }}>→</Text>
        </Pressable>
      ))}
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>General information about buying a home in India, not legal advice.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

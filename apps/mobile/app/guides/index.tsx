import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGuideStages, type GuideStage } from '../../lib/guides';
import { useTheme } from '../../lib/theme';

/** The guides as a journey: five steps down a line, each with its guides as coloured cards. */
export default function Guides() {
  const t = useTheme();
  const router = useRouter();
  const [stages, setStages] = useState<GuideStage[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getGuideStages().then(setStages).catch((e: Error) => setError(e.message)); }, []);
  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!stages) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const all = stages.flatMap((x) => x.guides);
  const open = (slug: string) => router.push({ pathname: '/guides/[slug]', params: { slug } });
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
      <View style={[s.hero, { backgroundColor: '#3730a3' }]}>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 }}>HOME BUYING GUIDES</Text>
        <Text accessibilityRole="header" style={{ color: '#fff', fontSize: 24, fontWeight: '800', lineHeight: 30 }}>Buy a home knowing what the seller knows</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 20 }}>{all.length} short guides, {all.reduce((n, g) => n + g.minutes, 0)} minutes in all, in the order you will need them.</Text>
        {all[0] ? <Pressable accessibilityRole="button" onPress={() => open(all[0].slug)} style={s.start}><Text style={{ color: '#312e81', fontWeight: '700' }}>Start with step 1 →</Text></Pressable> : null}
      </View>
      <View>
        {stages.map((st, i) => (
          <View key={st.key} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 34 }}>
              <View style={[s.dot, { backgroundColor: t.brand }]}><Text style={{ color: t.brandInk, fontWeight: '800' }}>{i + 1}</Text></View>
              {i < stages.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: t.line }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 22, gap: 4 }}>
              <Text style={{ color: t.brand, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 }}>{st.step.toUpperCase()}</Text>
              <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 19, fontWeight: '700' }}>{st.title}</Text>
              <Text style={{ color: t.muted, marginBottom: 6 }}>{st.blurb}</Text>
              {st.guides.map((g) => (
                <Pressable key={g.slug} accessibilityRole="button" accessibilityLabel={`${g.short}. ${g.minutes} minute read`} onPress={() => open(g.slug)} style={({ pressed }) => [s.card, { borderColor: pressed ? g.accent : t.line, backgroundColor: t.card, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                  <View style={[s.art, { backgroundColor: g.accent }]}><View style={s.artIn}><Text style={{ fontSize: 24 }}>{g.icon}</Text></View></View>
                  <View style={{ flex: 1, padding: 12, gap: 3 }}>
                    <Text style={{ color: t.fg, fontSize: 16, fontWeight: '700' }}>{g.short}</Text>
                    <Text numberOfLines={3} style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>{g.summary}</Text>
                    <Text style={{ color: g.accent, fontSize: 12, fontWeight: '700', marginTop: 2 }}>{g.minutes} min read →</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>General information about buying a home in India, not legal advice.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: 24, padding: 20, gap: 8 },
  start: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  art: { width: 76, alignItems: 'center', justifyContent: 'center' },
  artIn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
});

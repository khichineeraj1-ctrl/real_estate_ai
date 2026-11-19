import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGuideStages, type GuideStage } from '../lib/guides';
import { useTheme } from '../lib/theme';

/** "Know before you buy" on the home screen: the guides as coloured cards to swipe, in journey order. */
export function GuidesRow() {
  const t = useTheme();
  const router = useRouter();
  const [stages, setStages] = useState<GuideStage[] | null>(null);
  useEffect(() => { getGuideStages().then(setStages).catch(() => setStages(null)); }, []);
  if (!stages?.length) return null; // offline: the row simply is not there
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Know before you buy</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/guides')}><Text style={{ color: t.brand, fontWeight: '700' }}>All guides →</Text></Pressable>
      </View>
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>Short guides, in the order you will need them.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
        {stages.flatMap((st, n) => st.guides.map((g) => (
          <Pressable key={g.slug} accessibilityRole="button" accessibilityLabel={`${g.short}. Step ${n + 1}, ${st.title}. ${g.minutes} minute read`} onPress={() => router.push({ pathname: '/guides/[slug]', params: { slug: g.slug } })} style={({ pressed }) => [s.card, { backgroundColor: g.accent, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
            <View style={s.step}><Text numberOfLines={1} style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 }}>STEP {n + 1} · {st.title.toUpperCase()}</Text></View>
            <View style={s.icon}><Text style={{ fontSize: 26 }}>{g.icon}</Text></View>
            <Text numberOfLines={2} style={{ color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 21 }}>{g.short}</Text>
            <Text numberOfLines={3} style={{ color: 'rgba(255,255,255,0.86)', fontSize: 12.5, lineHeight: 17 }}>{g.summary}</Text>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 'auto' }}>{g.minutes} min read →</Text>
          </Pressable>
        )))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: 200, minHeight: 232, borderRadius: 22, padding: 16, gap: 6 },
  step: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  icon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 6 },
});

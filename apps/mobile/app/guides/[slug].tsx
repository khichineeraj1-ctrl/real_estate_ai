import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGuide, type Guide } from '../../lib/guides';
import { useTheme } from '../../lib/theme';

export default function GuideScreen() {
  const t = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [g, setG] = useState<Guide | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { setG(null); setOpen(null); getGuide(slug).then(setG).catch((e: Error) => setError(e.message)); }, [slug]);
  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!g) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Stack.Screen options={{ title: g.short }} />
      <View style={[s.hero, { backgroundColor: g.accent }]}>
        <View style={{ flex: 1, gap: 6 }}>
          {g.stageInfo ? <View style={s.stage}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{g.stageInfo.step.toUpperCase()} · {g.stageInfo.title.toUpperCase()}</Text></View> : null}
          <Text accessibilityRole="header" style={{ color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 }}>{g.title}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 21 }}>{g.summary}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{g.minutes} minute read</Text>
        </View>
        <View style={s.heroArt}><Text style={{ fontSize: 30 }}>{g.icon}</Text></View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(g.stats ?? []).map((x) => (
          <View key={x.label} style={[s.stat, { backgroundColor: t.card, borderColor: t.line }]}>
            <Text style={{ color: g.accent, fontSize: 24, fontWeight: '800' }}>{x.value}</Text>
            <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{x.label}</Text>
          </View>
        ))}
      </View>

      <View style={[s.box, { backgroundColor: t.soft, borderColor: g.accent }]}>
        <Text style={{ color: g.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>IN SHORT</Text>
        {g.takeaways.map((x) => <View key={x} style={{ flexDirection: 'row', gap: 8 }}><View style={[s.tick, { backgroundColor: g.accent }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text></View><Text style={{ flex: 1, color: t.fg, lineHeight: 21 }}>{x}</Text></View>)}
      </View>

      {g.sections.map((sec, n) => (
        <View key={sec.heading} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <View style={[s.num, { backgroundColor: t.soft }]}><Text style={{ color: g.accent, fontWeight: '800', fontSize: 13 }}>{n + 1}</Text></View>
            <Text accessibilityRole="header" style={{ flex: 1, color: t.fg, fontSize: 18, fontWeight: '700' }}>{sec.heading}</Text>
          </View>
          {sec.paras.map((p) => <Text key={p} style={{ color: t.fg, fontSize: 15, lineHeight: 24 }}>{p}</Text>)}
          {sec.bullets?.map((b) => { const [head, ...rest] = b.split(': '); return <View key={b} style={[s.point, { backgroundColor: t.card, borderColor: t.line, borderLeftColor: g.accent }]}>{rest.length ? <><Text style={{ color: t.fg, fontWeight: '700' }}>{head}</Text><Text style={{ color: t.muted, lineHeight: 21 }}>{rest.join(': ')}</Text></> : <Text style={{ color: t.fg, lineHeight: 21 }}>{b}</Text>}</View>; })}
        </View>
      ))}

      {g.tool ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(g.tool!.app as never)} style={[s.tool, { backgroundColor: g.accent }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{g.tool.label} →</Text>
        </Pressable>
      ) : null}

      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 4 }}>Common questions</Text>
      <View style={[s.faq, { borderColor: t.line }]}>
        {g.faqs.map((f, i) => (
          <Pressable key={f.q} accessibilityRole="button" accessibilityState={{ expanded: open === f.q }} onPress={() => setOpen(open === f.q ? null : f.q)} style={{ padding: 12, gap: 6, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.line }}>
            <View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ flex: 1, color: t.fg, fontWeight: '600', lineHeight: 21 }}>{f.q}</Text><Text style={{ color: t.muted, fontSize: 17 }}>{open === f.q ? '−' : '+'}</Text></View>
            {open === f.q ? <Text style={{ color: t.muted, lineHeight: 22 }}>{f.a}</Text> : null}
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        {g.prev ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/guides/[slug]', params: { slug: g.prev!.slug } })} style={[s.next, { borderColor: t.line, backgroundColor: t.card }]}><Text style={{ color: t.muted, fontSize: 11, fontWeight: '700' }}>← PREVIOUS</Text><Text numberOfLines={2} style={{ color: t.fg, fontWeight: '700' }}>{g.prev.icon} {g.prev.short}</Text></Pressable> : <View style={{ flex: 1 }} />}
        {g.next ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/guides/[slug]', params: { slug: g.next!.slug } })} style={[s.next, { borderColor: g.next.accent, backgroundColor: t.card, alignItems: 'flex-end' }]}><Text style={{ color: g.next.accent, fontSize: 11, fontWeight: '700' }}>NEXT →</Text><Text numberOfLines={2} style={{ color: t.fg, fontWeight: '700', textAlign: 'right' }}>{g.next.icon} {g.next.short}</Text></Pressable> : <Pressable accessibilityRole="button" onPress={() => router.push('/guides')} style={[s.next, { borderColor: t.line, backgroundColor: t.card, alignItems: 'flex-end' }]}><Text style={{ color: t.muted, fontSize: 11, fontWeight: '700' }}>FINISHED →</Text><Text style={{ color: t.fg, fontWeight: '700' }}>All guides</Text></Pressable>}
      </View>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>General information about buying a home in India, not legal advice. Laws and rates change and differ by state; have your own lawyer read your papers.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, padding: 18 },
  heroArt: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', transform: [{ rotate: '6deg' }] },
  stage: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  stat: { flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderRadius: 16, padding: 12, gap: 2 },
  tick: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  num: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  point: { borderWidth: 1, borderLeftWidth: 3, borderRadius: 12, padding: 11, gap: 2 },
  next: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 3 },
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  tool: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16 },
  faq: { borderWidth: 1, borderRadius: 14 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
});

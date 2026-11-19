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
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 23, fontWeight: '700', lineHeight: 30 }}>{g.title}</Text>
      <Text style={{ color: t.muted, fontSize: 15, lineHeight: 22 }}>{g.summary}</Text>
      <Text style={{ color: t.muted, fontSize: 12 }}>{g.icon} {g.minutes} minute read</Text>

      <View style={[s.box, { backgroundColor: t.soft, borderColor: t.brand }]}>
        <Text style={{ color: t.brand, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>IN SHORT</Text>
        {g.takeaways.map((x) => <View key={x} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: t.ready, fontWeight: '800' }}>✓</Text><Text style={{ flex: 1, color: t.fg, lineHeight: 21 }}>{x}</Text></View>)}
      </View>

      {g.sections.map((sec) => (
        <View key={sec.heading} style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 4 }}>{sec.heading}</Text>
          {sec.paras.map((p) => <Text key={p} style={{ color: t.fg, fontSize: 15, lineHeight: 24 }}>{p}</Text>)}
          {sec.bullets?.map((b) => { const [head, ...rest] = b.split(': '); return <View key={b} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: t.brand }}>•</Text><Text style={{ flex: 1, color: t.fg, fontSize: 15, lineHeight: 23 }}>{rest.length ? <><Text style={{ fontWeight: '700' }}>{head}: </Text>{rest.join(': ')}</> : b}</Text></View>; })}
        </View>
      ))}

      {g.tool ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(g.tool!.app as never)} style={[s.tool, { backgroundColor: t.brand }]}>
          <Text style={{ color: t.brandInk, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{g.tool.label} →</Text>
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

      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 4 }}>More guides</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {g.more.map((m) => <Pressable key={m.slug} accessibilityRole="button" onPress={() => router.push({ pathname: '/guides/[slug]', params: { slug: m.slug } })} style={[s.chip, { borderColor: t.line, backgroundColor: t.card }]}><Text style={{ color: t.fg, fontSize: 13 }}>{m.icon} {m.short}</Text></Pressable>)}
      </View>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>General information about buying a home in India, not legal advice. Laws and rates change and differ by state; have your own lawyer read your papers.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  tool: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16 },
  faq: { borderWidth: 1, borderRadius: 14 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
});

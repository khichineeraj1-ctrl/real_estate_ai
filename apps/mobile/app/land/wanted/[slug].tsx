import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PURPOSE_ICON, ReplyBox, Tag, ago, s } from '../../../components/Land';
import { getWantedOne, type WantedItem } from '../../../lib/api';
import { price } from '../../../lib/format';
import { useTheme } from '../../../lib/theme';

export default function Wanted() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [w, setW] = useState<(WantedItem & { closed: boolean }) | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setW(null); getWantedOne(slug).then(setW).catch((e: Error) => setError(e.message)); }, [slug]);
  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!w) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const facts: [string, string][] = [
    ['For', w.purposeLabel], ['Needs', w.kindLabel], ['Size', w.size], ['To', w.deal === 'LEASE' ? 'Take on rent' : 'Buy'],
    ['Where', `${w.where ? `${w.where}, ` : 'Anywhere in '}${w.state}`],
    ...(w.budgetInr ? [['Budget', `Up to ${price(w.budgetInr)}${w.deal === 'LEASE' ? ' a month' : ''}`] as [string, string]] : []),
    ['Posted by', `${w.by ?? 'A company (name kept private)'}, ${ago(w.createdAt).toLowerCase()}`],
  ];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: `Wanted: ${w.purposeLabel}` }} />
        <View style={{ backgroundColor: t.soft, borderRadius: 18, padding: 16, gap: 6 }}>
          <Text style={{ fontSize: 34 }}>{PURPOSE_ICON[w.purpose] ?? '📍'}</Text>
          <View style={s.tags}><Tag text="Wanted" /><Tag text={w.purposeLabel} />{w.closed ? <Tag text="Closed" tone="closed" /> : null}</View>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 21, fontWeight: '800', lineHeight: 27 }}>{w.size} of {w.kindLabel.toLowerCase()} wanted {w.deal === 'LEASE' ? 'on rent' : 'to buy'}</Text>
          <Text style={{ color: t.muted }}>{w.where ? `${w.where}, ` : ''}{w.state}</Text>
        </View>
        {!w.closed && (
          <View style={[s.panel, { backgroundColor: t.soft, borderColor: t.line }]}>
            <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Do you have something that fits?</Text>
            <Text style={{ color: t.muted, lineHeight: 20 }}>Tell us what you have. Our team passes it on and calls you back.{w.answers ? ` ${w.answers} owner${w.answers === 1 ? ' has' : 's have'} answered so far.` : ''}</Text>
            <ReplyBox key={w.slug} type="wanted" slug={w.slug} label="I have land like this" sent="Our team will pass this on and call you." />
          </View>
        )}
        {w.details ? <View style={{ gap: 6 }}><Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>What it must have</Text><Text style={{ color: t.fg, lineHeight: 22 }}>{w.details}</Text></View> : null}
        <View style={{ borderWidth: 1, borderRadius: 14, borderColor: t.line }}>
          {facts.map(([k, v], i) => <View key={k} style={[s.fact, { borderColor: t.line, borderTopWidth: i ? StyleSheet.hairlineWidth : 0 }]}><Text style={{ color: t.muted, fontSize: 12 }}>{k}</Text><Text style={{ color: t.fg, fontWeight: '600' }}>{v}</Text></View>)}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

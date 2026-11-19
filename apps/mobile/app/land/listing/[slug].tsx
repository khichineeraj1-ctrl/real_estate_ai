import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KIND_ICON, LandCard, ReplyBox, Tag, ago, landPrice, s, useTint } from '../../../components/Land';
import { getLandOne, type LandDetail } from '../../../lib/api';
import { useTheme } from '../../../lib/theme';

const USE: Record<string, string> = { AGRICULTURAL: 'Agricultural', RESIDENTIAL: 'Residential', COMMERCIAL: 'Commercial', INDUSTRIAL: 'Industrial' };
const POSTER: Record<string, string> = { OWNER: 'The owner', DEALER: 'A dealer', COMPANY: 'A company' };

export default function LandListing() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [l, setL] = useState<LandDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setL(null); getLandOne(slug).then(setL).catch((e: Error) => setError(e.message)); }, [slug]);
  const [ink, bg] = useTint(l?.kind ?? 'FARM');
  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!l) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const space = l.kind === 'BUILT' ? 'space' : 'land';
  const facts: [string, string][] = [
    ['Size', l.areaAlso ? `${l.area} (about ${l.areaAlso})` : l.area],
    [l.deal === 'LEASE' ? 'Rent' : 'Asking price', landPrice(l)],
    ...(l.rate ? [['That works out to', l.rate] as [string, string]] : []),
    ...(l.roadFt ? [['Road in front', `${l.roadFt} ft wide`] as [string, string]] : []),
    ...(l.highway ? [['Nearest main road', `${l.highway}${l.highwayKm != null ? `, ${l.highwayKm} km away` : ''}`] as [string, string]] : []),
    ...(l.kind !== 'BUILT' ? [['Land use, as the poster says', l.landUse ? USE[l.landUse] : 'Not stated: ask'] as [string, string]] : []),
    ...(l.clearHeightFt ? [['Clear height', `${l.clearHeightFt} ft`] as [string, string]] : []),
    ...(l.powerKva ? [['Power load', `${l.powerKva} kVA`] as [string, string]] : []),
    ...(l.docks != null ? [['Loading docks', String(l.docks)] as [string, string]] : []),
    ['Listed by', `${POSTER[l.posterIs] ?? 'The owner'}, ${ago(l.createdAt).toLowerCase()}`],
  ];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: `${l.place}, ${l.district}` }} />
        <View style={{ backgroundColor: bg, borderRadius: 18, padding: 16, gap: 6 }}>
          <Text style={{ fontSize: 34 }}>{KIND_ICON[l.kind]}</Text>
          <View style={s.tags}><Tag text={l.kindLabel} /><Tag text={l.deal === 'LEASE' ? 'For rent' : 'For sale'} tone={l.deal === 'LEASE' ? 'rent' : undefined} />{l.closed ? <Tag text="No longer available" tone="closed" /> : null}</View>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 21, fontWeight: '800', lineHeight: 27 }}>{l.title.charAt(0).toUpperCase() + l.title.slice(1)}</Text>
          <Text style={{ color: t.muted }}>{l.place}, {l.district}, {l.state}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[s.panel, { flex: 1, gap: 0, borderColor: t.line, backgroundColor: t.card }]}><Text style={{ color: t.muted, fontSize: 12 }}>Size</Text><Text style={{ color: ink, fontSize: 18, fontWeight: '800' }}>{l.area}</Text>{l.areaAlso ? <Text style={{ color: t.muted, fontSize: 12 }}>about {l.areaAlso}</Text> : null}</View>
          <View style={[s.panel, { flex: 1, gap: 0, borderColor: t.line, backgroundColor: t.card }]}><Text style={{ color: t.muted, fontSize: 12 }}>{l.deal === 'LEASE' ? 'Rent' : 'Price'}</Text><Text style={{ color: t.fg, fontSize: 18, fontWeight: '800' }}>{landPrice(l)}</Text>{l.rate ? <Text style={{ color: t.muted, fontSize: 12 }}>{l.rate}</Text> : null}</View>
        </View>

        {!l.closed && (
          <View style={[s.panel, { backgroundColor: t.soft, borderColor: t.line }]}>
            <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Interested in this {space}?</Text>
            <Text style={{ color: t.muted, lineHeight: 20 }}>Send your number. Our team speaks to the {l.posterIs === 'OWNER' ? 'owner' : 'lister'} and calls you back.</Text>
            <ReplyBox key={l.slug} type="listing" slug={l.slug} label="Ask about this" sent="Our team will call you after speaking to the lister." />
          </View>
        )}

        {l.description ? <View style={{ gap: 6 }}><Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>In the lister’s words</Text><Text style={{ color: t.fg, lineHeight: 22 }}>{l.description}</Text></View> : null}
        {l.features.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{l.features.map((f) => <View key={f} style={{ backgroundColor: t.readyBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: t.ready, fontWeight: '600', fontSize: 13 }}>✓ {f}</Text></View>)}</View>}

        <View style={{ borderWidth: 1, borderRadius: 14, borderColor: t.line }}>
          {facts.map(([k, v], i) => <View key={k} style={[s.fact, { borderColor: t.line, borderTopWidth: i ? StyleSheet.hairlineWidth : 0 }]}><Text style={{ color: t.muted, fontSize: 12 }}>{k}</Text><Text selectable style={{ color: t.fg, fontWeight: '600' }}>{v}</Text></View>)}
        </View>
        <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>Everything here is as told to us by the lister. We check that a listing is genuine and complete, but we have not seen the ownership papers or measured the land.</Text>

        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 6 }}>Before you pay anything</Text>
        <Text style={{ color: t.muted, lineHeight: 20, marginTop: -8 }}>{l.checks.length} things to check. The rules differ from state to state, so treat these as questions to ask, and take a local lawyer’s advice before a large payment.</Text>
        {l.checks.map((c, i) => (
          <View key={c.key} style={[s.panel, { flexDirection: 'row', gap: 12, borderColor: t.line, backgroundColor: t.card }]}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.brandInk, fontWeight: '700', fontSize: 13 }}>{i + 1}</Text></View>
            <View style={{ flex: 1, gap: 3 }}><Text style={{ color: t.fg, fontWeight: '700', lineHeight: 20 }}>{c.title}</Text><Text style={{ color: t.muted, lineHeight: 20, fontSize: 14 }}>{c.why}</Text></View>
          </View>
        ))}

        {l.nearby.length > 0 && <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 6 }}>More in {l.district}</Text>}
        {l.nearby.map((n) => <LandCard key={n.slug} l={n} />)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

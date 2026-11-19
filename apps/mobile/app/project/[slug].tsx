import { CompareToggle } from '../../components/tools/Compare';
import { Photos } from '../../components/Photos';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PropertyCard } from '../../components/PropertyCard';
import { ConnectButton } from '../../components/LeadForm';
import { getProject, photoUrl, type ProjectDetail } from '../../lib/api';
import { monthYear, num, statusLabel } from '../../lib/format';
import { useTheme, type Theme } from '../../lib/theme';

export default function Project() {
  const t = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [p, setP] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setP(null); getProject(slug).then(setP).catch((e: Error) => setError(e.message)); }, [slug]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!p) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const facts: [string, string][] = [
    ...(p.brand ? [] : [['Builder', p.builder] as [string, string]]),
    ...(p.brand && p.brand.name !== p.builder ? [['Registered by', p.builder] as [string, string]] : []),
    ...(p.registerSource
      ? [['RERA status', p.registerStatus ?? 'Registered'] as [string, string], ...(p.registerValidUntil ? [['Registration valid to', monthYear(p.registerValidUntil) ?? ''] as [string, string]] : [])]
      : [['Status', statusLabel(p.status)] as [string, string], ...(p.possession ? [['Possession', monthYear(p.possession) ?? ''] as [string, string]] : [])]),
    ...(p.totalUnits != null ? [['Total units', num(p.totalUnits)] as [string, string]] : []),
    ...(p.reraId ? [['RERA number', p.reraId] as [string, string]] : []),
  ];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: p.name }} />
        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 22, fontWeight: '700', lineHeight: 28 }}>{p.name}</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/locality/[city]/[slug]', params: { city: p.city.slug, slug: p.locality.slug } })}>
          <Text style={{ color: t.brand }}>{p.locality.name}, {p.city.name}</Text>
        </Pressable>
        <Text style={{ color: t.fg, lineHeight: 22 }}>{p.description}</Text>
        <Photos photos={p.photos ?? []} videos={p.videos ?? []} name={p.name} />

        {p.registerSource && (
          <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>
            <Text style={{ color: t.fg, fontWeight: '700' }}>From the public RERA register, not yet confirmed by the builder.</Text>
            <Text style={{ color: t.muted, lineHeight: 20 }}>
              These details are as published by {p.registerName}{p.sourceFetchedAt ? `, read on ${new Date(p.sourceFetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. The register does not give prices, floor plans or whether building is finished, so we do not show them.
            </Text>
            {/lapsed/i.test(p.registerStatus ?? '') ? <Text style={{ color: t.danger, lineHeight: 20 }}>The register marks this project’s registration as lapsed. Ask the builder about this before paying anything.</Text> : null}
            {p.sourceUrl ? (
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(p.sourceUrl!)}><Text style={{ color: t.brand, fontWeight: '600' }}>See the register’s own page ↗</Text></Pressable>
            ) : null}
          </View>
        )}

        <View style={[s.table, { borderColor: t.line }]}>
          {p.brand && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Builder: ${p.brand.name}. See its projects in ${p.city.name}`} onPress={() => router.push({ pathname: '/builder/[city]/[slug]', params: { city: p.city.slug, slug: p.brand!.slug } })} style={[s.fact, { borderColor: t.line, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1, gap: 2 }}><Text style={{ color: t.muted, fontSize: 12 }}>Builder</Text><Text style={{ color: t.brand, fontWeight: '700' }}>{p.brand.name}</Text></View>
              <Text style={{ color: t.brand }}>All projects in {p.city.name} ›</Text>
            </Pressable>
          )}
          {facts.map(([k, v], i) => (
            <View key={k} style={[s.fact, { borderColor: t.line, borderTopWidth: i || p.brand ? StyleSheet.hairlineWidth : 0 }]}>
              <Text style={{ color: t.muted, fontSize: 12 }}>{k}</Text>
              <Text selectable style={{ color: t.fg, fontWeight: '600' }}>{v}</Text>
            </View>
          ))}
        </View>

        {(p.agents?.length ?? 0) > 0 && (
          <View style={[s.box, { backgroundColor: t.readyBg, borderColor: t.ready }]}>
            <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Verified agents selling {p.name}</Text>
            {p.agents!.map((a) => (
              <View key={a.id}><Text style={{ color: t.fg, fontWeight: '600' }}>{a.name}{a.firmName ? `, ${a.firmName}` : ''}</Text><Text style={{ color: t.ready, fontSize: 13, fontWeight: '600' }}>✓ {a.label}{a.yearsInBusiness ? ` · ${a.yearsInBusiness} years in business` : ''}</Text></View>
            ))}
            <ConnectButton kind="project" slug={p.slug} name={p.name} mode="agent" agents={p.agents!.length} unclaimed={!!p.registerSource} />
          </View>
        )}

        <View style={[s.box, { backgroundColor: t.card, borderColor: t.line }]}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>How does {p.name} compare?</Text>
          <Text style={{ color: t.muted, lineHeight: 20 }}>Add it, then add other projects, to see them side by side: builder, RERA standing, verified agents and homes for sale.</Text>
          <CompareToggle kind="projects" slug={p.slug} title={p.name} />
        </View>

        <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>{p.registerSource ? 'Interested in this project?' : 'Get prices, floor plans and a site visit'}</Text>
          <Text style={{ color: t.muted, lineHeight: 20 }}>{p.registerSource ? 'Our team will call you with prices and availability.' : `The sales team for ${p.name} will call you back.`}</Text>
          <ConnectButton key={p.slug} kind="project" slug={p.slug} name={p.name} mode="callback" unclaimed={!!p.registerSource} interests={p.bhk.map((b) => `${b.bhk} BHK`)} big />
        </View>

        {p.properties.length > 0 && <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Homes for sale in {p.name}</Text>}
        {p.properties.map((h) => <PropertyCard key={h.slug} p={h} />)}

        {p.amenities.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Amenities</Text>
            <View style={s.chips}>{p.amenities.map((a) => <View key={a} style={[s.chip, { borderColor: t.line, backgroundColor: t.soft }]}><Text style={{ color: t.fg }}>{a}</Text></View>)}</View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  button: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  table: { borderWidth: 1, borderRadius: 14 },
  fact: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
});

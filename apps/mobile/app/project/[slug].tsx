import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PropertyCard } from '../../components/PropertyCard';
import { TIMELINES, getProject, sendProjectEnquiry, type ProjectDetail } from '../../lib/api';
import { monthYear, num, statusLabel } from '../../lib/format';
import { useTheme, type Theme } from '../../lib/theme';

/** Leaves the buyer's details for a call back. For a project taken from a register, our own team calls, since the builder has not joined. */
function LeadForm({ p, t }: { p: ProjectDetail; t: Theme }) {
  const unclaimed = !!p.registerSource;
  const sizes = p.bhk.map((b) => `${b.bhk} BHK`);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [timeline, setTimeline] = useState('');
  const [visit, setVisit] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name.trim() || !phone.trim()) { setError('Enter your name and phone number'); return; }
    if (!consent) { setError('Turn on the switch to agree to be contacted'); return; }
    setBusy(true); setError('');
    try { await sendProjectEnquiry(p.slug, { name, phone, interest: interest || undefined, timeline: timeline || undefined, wantsVisit: visit }); setDone(true); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  if (done) {
    return (
      <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]} accessibilityLiveRegion="polite">
        <Text style={{ color: t.fg, fontWeight: '700', fontSize: 16 }}>{unclaimed ? 'Thank you. Our team has your details.' : 'Thank you. Your details are with the sales team.'}</Text>
        <Text style={{ color: t.fg, lineHeight: 21 }}>{unclaimed ? `We will call you about ${p.name}. The builder has not joined us yet, so we will find out what we can for you.` : `Someone will call you about ${p.name} with prices, floor plans and site visit times.`}</Text>
        <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}>Do not pay a booking amount to anyone before you have seen the site and checked the project’s RERA registration.</Text>
      </View>
    );
  }
  const input = [s.input, { color: t.fg, borderColor: t.line, backgroundColor: t.card }];
  return (
    <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>{unclaimed ? 'Interested in this project?' : 'Get prices, floor plans and a site visit'}</Text>
      <Text style={{ color: t.muted, lineHeight: 20 }}>{unclaimed ? `Leave your details and our team will call you. ${p.builder} has not joined us yet, so we will find out prices and availability for you.` : `Leave your details and the sales team for ${p.name} will call you back.`}</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={t.muted} accessibilityLabel="Your name" autoComplete="name" maxLength={80} style={input} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={t.muted} accessibilityLabel="Phone" keyboardType="phone-pad" autoComplete="tel" maxLength={20} style={input} />
      {sizes.length > 0 && (
        <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel="Interested in">
          {sizes.map((x) => (
            <Pressable key={x} accessibilityRole="radio" accessibilityState={{ selected: interest === x }} onPress={() => setInterest(interest === x ? '' : x)} style={[s.chip, { borderColor: interest === x ? t.brand : t.line, backgroundColor: interest === x ? t.brand : t.card }]}>
              <Text style={{ color: interest === x ? t.brandInk : t.fg }}>{x}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ gap: 6 }}>
        <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>When do you plan to buy? <Text style={{ color: t.muted, fontWeight: '400' }}>(optional)</Text></Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
          {TIMELINES.map(([code, label]) => (
            <Pressable key={code} accessibilityRole="radio" accessibilityState={{ selected: timeline === code }} onPress={() => setTimeline(timeline === code ? '' : code)} style={{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderColor: timeline === code ? t.brand : t.line, backgroundColor: timeline === code ? t.brand : t.card }}>
              <Text style={{ color: timeline === code ? t.brandInk : t.fg, fontSize: 13 }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={visit} onValueChange={setVisit} accessibilityLabel="I would like to arrange a site visit" trackColor={{ true: t.brand }} />
        <Text style={{ color: t.fg, flex: 1, fontSize: 14 }}>I would like to arrange a site visit</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={consent} onValueChange={setConsent} accessibilityLabel="I agree to be contacted about this project" trackColor={{ true: t.brand }} />
        <Text style={{ color: t.muted, flex: 1, fontSize: 13 }}>{unclaimed ? `I agree to be contacted by phone about ${p.name} by this app’s team, who may pass my enquiry to the builder.` : `I agree to be contacted by phone about ${p.name} by the builder and this app’s team.`}</Text>
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: t.danger }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={[s.button, { backgroundColor: t.brand, opacity: busy ? 0.6 : 1 }]}>
        <Text style={{ color: t.brandInk, fontWeight: '700' }}>{busy ? 'Sending…' : 'Request a call back'}</Text>
      </Pressable>
    </View>
  );
}

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

        <LeadForm key={p.slug} p={p} t={t} />

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

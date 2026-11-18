import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PropertyCard } from '../../components/PropertyCard';
import { CostCalculator, EmiCalculator } from '../../components/tools/Calculators';
import { CompareToggle } from '../../components/tools/Compare';
import { REPORT_REASONS, getProperty, photoUrl, sendEnquiry, sendReport, type EnquiryResult, type PropertyDetail } from '../../lib/api';
import { num, price, statusLabel, typeLabel } from '../../lib/format';
import { useTheme, type Theme } from '../../lib/theme';

function Report({ slug, t }: { slug: string; t: Theme }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason) { setError('Choose what is wrong'); return; }
    setBusy(true); setError('');
    try { await sendReport(slug, { reason, details, name, phone }); setDone(true); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  if (done) return <Text accessibilityLiveRegion="polite" style={{ color: t.ready }}>Thank you. Our team will look into this and may call you. We do not tell the seller who reported them.</Text>;
  if (!open) return <Pressable accessibilityRole="button" onPress={() => setOpen(true)}><Text style={{ color: t.muted, textDecorationLine: 'underline' }}>Something wrong with this listing or seller? Report it</Text></Pressable>;
  const input = [s.input, { color: t.fg, borderColor: t.line, backgroundColor: t.card }];
  return (
    <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Report this listing</Text>
      <Text style={{ color: t.muted, fontSize: 13 }}>Our team looks into every report. A report we uphold lowers the seller’s confidence level for all buyers.</Text>
      <View accessibilityRole="radiogroup" style={{ gap: 6 }}>
        {REPORT_REASONS.map(([value, label]) => (
          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: reason === value }} onPress={() => setReason(value)} style={{ borderWidth: 1, borderRadius: 10, padding: 10, borderColor: reason === value ? t.brand : t.line, backgroundColor: t.card }}>
            <Text style={{ color: reason === value ? t.brand : t.fg, fontWeight: reason === value ? '700' : '400' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={details} onChangeText={setDetails} placeholder="What happened?" placeholderTextColor={t.muted} accessibilityLabel="What happened" multiline maxLength={1000} style={[input, { minHeight: 80, textAlignVertical: 'top' }]} />
      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={t.muted} accessibilityLabel="Your name" autoComplete="name" maxLength={80} style={input} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="Phone (not shared with the seller)" placeholderTextColor={t.muted} accessibilityLabel="Phone" keyboardType="phone-pad" autoComplete="tel" maxLength={20} style={input} />
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: t.danger }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={[s.button, { borderWidth: 1, borderColor: t.brand, opacity: busy ? 0.6 : 1 }]}>
        <Text style={{ color: t.brand, fontWeight: '700' }}>{busy ? 'Sending…' : 'Send report'}</Text>
      </Pressable>
    </View>
  );
}

function Enquiry({ slug, t }: { slug: string; t: Theme }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<EnquiryResult | null>(null);

  async function submit() {
    if (!name.trim() || !phone.trim()) { setError('Enter your name and phone number'); return; }
    if (!consent) { setError('Turn on the switch to share your details with the seller'); return; }
    setBusy(true); setError('');
    try { setDone(await sendEnquiry(slug, { name, phone })); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  if (done) {
    return (
      <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]} accessibilityLiveRegion="polite">
        <Text style={{ color: t.fg, fontWeight: '700', fontSize: 16 }}>Your enquiry is sent.</Text>
        {done.seller ? (
          <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${done.seller!.phone}`)}>
            <Text style={{ color: t.fg }}>Call the seller, {done.seller.name}: <Text style={{ color: t.brand, fontWeight: '700' }}>{done.seller.phone}</Text></Text>
          </Pressable>
        ) : <Text style={{ color: t.fg }}>Our team will call you about this home.</Text>}
        {done.seller && (done.seller.level ?? 0) < 2 ? <Text style={{ color: t.danger }}>We have not fully verified this seller yet. Do not pay a token, booking amount or any advance before you have seen the home and had its papers checked.</Text> : null}
      </View>
    );
  }
  const input = [s.input, { color: t.fg, borderColor: t.line, backgroundColor: t.card }];
  return (
    <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Contact the seller</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={t.muted} accessibilityLabel="Your name" autoComplete="name" maxLength={80} style={input} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={t.muted} accessibilityLabel="Phone" keyboardType="phone-pad" autoComplete="tel" maxLength={20} style={input} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={consent} onValueChange={setConsent} accessibilityLabel="Share my name and phone number with the seller" trackColor={{ true: t.brand }} />
        <Text style={{ color: t.muted, flex: 1, fontSize: 13 }}>Share my name and phone number with the seller so they can contact me about this home.</Text>
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: t.danger }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={[s.button, { backgroundColor: t.brand, opacity: busy ? 0.6 : 1 }]}>
        <Text style={{ color: t.brandInk, fontWeight: '700' }}>{busy ? 'Sending…' : 'Get seller’s contact'}</Text>
      </Pressable>
    </View>
  );
}

export default function Property() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [p, setP] = useState<PropertyDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setP(null); getProperty(slug).then(setP).catch((e: Error) => setError(e.message)); }, [slug]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!p) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const rows: [string, string | null][] = [
    ['Type', typeLabel(p.type)], ['Bedrooms', p.bhk ? `${p.bhk} BHK` : null], ['Bathrooms', p.bathrooms ? String(p.bathrooms) : null], ['Area', `${num(p.areaSqft)} sq ft`],
    ['Floor', p.floor != null ? `${p.floor} of ${p.totalFloors}` : null], ['Facing', p.facing], ['Furnishing', p.furnishing], ['Status', statusLabel(p.status)],
    ['Project', p.project?.name ?? null], ['RERA number', p.project?.reraId ?? null],
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Stack.Screen options={{ title: p.title.split(' in ')[0] }} />
      {(p.photos?.length ?? 0) > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {p.photos.map((ph, i) => (
            <Image key={ph.file} source={{ uri: photoUrl(ph.file) }} accessibilityLabel={`Photo ${i + 1} of ${p.photos.length}`} style={[s.photo, { backgroundColor: t.soft }]} resizeMode="cover" accessibilityIgnoresInvertColors />
          ))}
        </ScrollView>
      )}
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 21, fontWeight: '700', lineHeight: 27 }}>{p.title}</Text>
      <View>
        <Text style={{ color: t.fg, fontSize: 28, fontWeight: '800' }}>{price(p.priceInr)}</Text>
        <Text style={{ color: t.muted }}>₹{num(Math.round(p.priceInr / p.areaSqft))}/sq ft · area average ₹{num(p.localityStats.avgRate)}/sq ft</Text>
      </View>
      <View style={[s.table, { borderColor: t.line }]}>
        {rows.filter((r) => r[1]).map(([k, v]) => (
          <View key={k} style={[s.row, { borderColor: t.line }]}><Text style={{ color: t.muted }}>{k}</Text><Text style={{ color: t.fg, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{v}</Text></View>
        ))}
      </View>
      <CompareToggle slug={p.slug} title={p.title} />
      <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>
        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>How confident can you be?</Text>
        <Text style={{ color: p.confidence.level >= 2 ? t.ready : t.fg, fontWeight: '700' }}>{p.confidence.level >= 2 ? '✓ ' : ''}{p.confidence.label}</Text>
        {p.confidence.reasons.map((r) => (
          <Text key={r.text} accessibilityLabel={`${r.ok ? 'Checked' : 'Not checked'}: ${r.text}`} style={{ color: r.ok ? t.fg : t.muted, lineHeight: 20 }}>{r.ok ? '✓' : '○'}  {r.text}</Text>
        ))}
        <Text style={{ color: t.fg }}>{p.seller ? `Seller: ${p.seller.firmName ?? p.seller.name} (${p.seller.confidence.label.toLowerCase()})` : 'Listed through our team, not by an outside seller.'}</Text>
        <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>Our checks reduce risk; they are not a guarantee. Before paying anything, see the home yourself and have a lawyer check the title papers.</Text>
      </View>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 8 }}>What will it really cost?</Text>
      {p.costs ? <CostCalculator key={`cost-${p.slug}`} price={p.priceInr} costs={p.costs} cityName={p.city.name} underConstruction={p.status === 'UNDER_CONSTRUCTION'} /> : <Text style={{ color: t.muted }}>We do not have the government charges for {p.city.name} yet.</Text>}
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 8 }}>Monthly EMI for this home</Text>
      <EmiCalculator key={`emi-${p.slug}`} price={p.priceInr} />
      <Enquiry key={p.slug} slug={p.slug} t={t} />
      <Report key={`report-${p.slug}`} slug={p.slug} t={t} />
      <Text style={{ color: t.fg, fontSize: 16, lineHeight: 23 }}>{p.description}</Text>
      {p.amenities.length > 0 && <Text style={{ color: t.muted }}>{p.amenities.join(' · ')}</Text>}
      {p.similar.length > 0 && <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 8 }}>Similar homes in {p.locality.name}</Text>}
      {p.similar.map((x) => <PropertyCard key={x.slug} p={x} />)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  photo: { width: 300, height: 210, borderRadius: 14 },
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  button: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  table: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
});

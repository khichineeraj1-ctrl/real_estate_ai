import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PropertyCard } from '../../components/PropertyCard';
import { CostCalculator, EmiCalculator } from '../../components/tools/Calculators';
import { CompareToggle } from '../../components/tools/Compare';
import { getProperty, photoUrl, sendEnquiry, type EnquiryResult, type PropertyDetail } from '../../lib/api';
import { num, price, statusLabel, typeLabel } from '../../lib/format';
import { useTheme, type Theme } from '../../lib/theme';

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
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 8 }}>What will it really cost?</Text>
      {p.costs ? <CostCalculator key={`cost-${p.slug}`} price={p.priceInr} costs={p.costs} cityName={p.city.name} underConstruction={p.status === 'UNDER_CONSTRUCTION'} /> : <Text style={{ color: t.muted }}>We do not have the government charges for {p.city.name} yet.</Text>}
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 8 }}>Monthly EMI for this home</Text>
      <EmiCalculator key={`emi-${p.slug}`} price={p.priceInr} />
      <Enquiry key={p.slug} slug={p.slug} t={t} />
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

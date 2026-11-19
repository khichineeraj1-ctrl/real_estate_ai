import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Choice, Field, KIND_ICON, Picker, Tick, phoneOk, s, states } from '../../components/Land';
import { getLandOptions, postLand, uploadLandPhoto, type LandOptions } from '../../lib/api';
import { rememberPost } from '../../lib/landposts';
import { useTheme } from '../../lib/theme';

const USE: Record<string, string> = { AGRICULTURAL: 'Agricultural', RESIDENTIAL: 'Residential', COMMERCIAL: 'Commercial', INDUSTRIAL: 'Industrial' };
const BUILT_ONLY = ['GROUND_FLOOR', 'PARKING'];
const MAX_PHOTOS = 8;

/** An owner, dealer or company lists land or built space. No account: one form, checked by our team before it shows. */
export default function PostLand() {
  const t = useTheme();
  const router = useRouter();
  const [o, setO] = useState<LandOptions | null>(null);
  const [f, setF] = useState<Record<string, string>>({ kind: 'FARM', deal: 'SALE', areaUnit: 'acre', posterIs: 'OWNER', landUse: '' });
  const [features, setFeatures] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<{ uri: string; mimeType?: string | null }[]>([]);
  const [progress, setProgress] = useState('');
  const [missed, setMissed] = useState(0);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');
  useEffect(() => { getLandOptions().then(setO).catch((e: Error) => setError(e.message)); }, []);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const pickKind = (k: string) => setF((x) => ({ ...x, kind: k, ...(k === 'BUILT' ? { areaUnit: 'sqft', deal: 'LEASE' } : x.areaUnit === 'sqft' ? { areaUnit: 'acre' } : {}) }));
  if (!o) return error ? <Text style={{ color: t.danger, padding: 16 }}>{error}</Text> : <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  if (state === 'done') return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: t.readyBg, borderRadius: 16, padding: 16, gap: 6 }}>
        <Text style={{ color: t.ready, fontSize: 18, fontWeight: '800' }}>✓ Received</Text>
        <Text style={{ color: t.fg, lineHeight: 21 }}>Our team will check it, usually within a working day, and then it shows to buyers. You can see its status and take it down from the Land screen on this phone.</Text>
        {missed ? <Text style={{ color: t.danger, lineHeight: 21 }}>{missed} photo{missed === 1 ? '' : 's'} could not be sent. The listing itself is saved.</Text> : null}
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={[s.btn, { backgroundColor: t.brand }]}><Text style={{ color: t.brandInk, fontWeight: '700' }}>Back to land</Text></Pressable>
    </View>
  );
  const built = f.kind === 'BUILT';
  const ok = !!f.state && (f.district ?? '').trim().length > 1 && (f.place ?? '').trim().length > 1 && Number(f.areaValue) > 0 && (f.name ?? '').trim().length > 1 && phoneOk(f.phone ?? '') && consent;
  const send = () => {
    setState('busy'); setError('');
    postLand('listing', { ...f, features }).then(async (r) => {
      await rememberPost(r.token);
      // The listing is saved first; photos follow one at a time, so a weak connection loses one photo and not the listing.
      let failed = 0;
      for (let i = 0; i < photos.length; i++) { setProgress(`Sending photo ${i + 1} of ${photos.length}…`); try { await uploadLandPhoto(r.token, photos[i]); } catch { failed++; } }
      setMissed(failed); setState('done');
    }).catch((e: Error) => { setError(e.message); setState('idle'); });
  };
  // The picker makes each photo smaller before it is sent: phone photos are far larger than the app ever shows.
  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length, quality: 0.7 });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType }))].slice(0, MAX_PHOTOS));
  };
  const local = o.units.find((u) => u.code === f.areaUnit)?.local;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.muted, lineHeight: 21 }}>One form, no account. Free. Your number is never shown: buyers’ enquiries come to you through our team.</Text>
        <Choice label="What are you listing?" value={f.kind} set={pickKind} options={o.kinds.map((k) => ({ ...k, icon: KIND_ICON[k.code] }))} />
        <Choice label="You want to" value={f.deal} set={set('deal')} options={[{ code: 'SALE', label: 'Sell it' }, { code: 'LEASE', label: 'Rent it out' }]} />

        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Where is it?</Text>
        <Picker label="State" value={f.state ?? ''} set={set('state')} options={states(o.states)} placeholder="Choose a state" />
        <Field label="District" value={f.district ?? ''} onChangeText={set('district')} placeholder="e.g. Alwar" maxLength={60} />
        <Field label="Town or village" value={f.place ?? ''} onChangeText={set('place')} placeholder="e.g. Tijara" maxLength={80} />

        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Size and price</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label={built ? 'Covered area' : 'Size'} value={f.areaValue ?? ''} onChangeText={set('areaValue')} keyboardType="decimal-pad" placeholder="e.g. 2" /></View>
          <View style={{ flex: 1 }}><Picker label="Unit" value={f.areaUnit} set={set('areaUnit')} options={o.units} /></View>
        </View>
        {local ? <Text style={{ color: t.muted, fontSize: 12, marginTop: -10 }}>A {f.areaUnit} is a different size in different places, so we will show it exactly as you write it.</Text> : null}
        <Field label={f.deal === 'LEASE' ? 'Rent per month, in rupees (optional)' : 'Asking price, in rupees (optional)'} value={f.priceInr ?? ''} onChangeText={set('priceInr')} keyboardType="number-pad" hint="The total, not per unit. Leave empty to show “Price on request”." />

        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Road and use</Text>
        <Field label="Width of the road in front, in feet (optional)" value={f.roadFt ?? ''} onChangeText={set('roadFt')} keyboardType="number-pad" />
        <Field label="Nearest highway or main road (optional)" value={f.highway ?? ''} onChangeText={set('highway')} placeholder="e.g. NH-48" maxLength={60} />
        <Field label="How far is it, in km (optional)" value={f.highwayKm ?? ''} onChangeText={set('highwayKm')} keyboardType="decimal-pad" />
        {!built ? <Choice label="Land use in the records" value={f.landUse} set={set('landUse')} options={[{ code: '', label: 'Not sure' }, ...o.landUses.map((u) => ({ code: u, label: USE[u] ?? u }))]} /> : null}
        {built ? <Field label="Clear height, in feet (optional)" value={f.clearHeightFt ?? ''} onChangeText={set('clearHeightFt')} keyboardType="number-pad" /> : null}
        {built || f.kind === 'INDUSTRIAL' ? <Field label="Power load, in kVA (optional)" value={f.powerKva ?? ''} onChangeText={set('powerKva')} keyboardType="number-pad" /> : null}
        {built ? <Field label="Loading docks (optional)" value={f.docks ?? ''} onChangeText={set('docks')} keyboardType="number-pad" /> : null}
        <View style={{ gap: 10 }}>
          <Text style={{ color: t.fg, fontWeight: '700' }}>Tick what is true</Text>
          {o.features.filter((x) => built || !BUILT_ONLY.includes(x.code)).map((x) => <Tick key={x.code} label={x.label} on={features.includes(x.code)} set={(v) => setFeatures((a) => (v ? [...a, x.code] : a.filter((c) => c !== x.code)))} />)}
        </View>
        <Field label="Anything else a buyer should know (optional)" value={f.description ?? ''} onChangeText={set('description')} multiline maxLength={1000} placeholder="e.g. Two sides open, canal on the east" />

        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Photos <Text style={{ color: t.muted, fontWeight: '400', fontSize: 14 }}>(optional, up to {MAX_PHOTOS})</Text></Text>
        {photos.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((p, i) => (
              <View key={p.uri} style={s.thumb}>
                <Image source={{ uri: p.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel={`Photo ${i + 1}`} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} hitSlop={8} onPress={() => setPhotos((a) => a.filter((x) => x.uri !== p.uri))} style={s.x}><Text style={{ color: '#fff', fontSize: 16, lineHeight: 18 }}>×</Text></Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {photos.length < MAX_PHOTOS ? (
          <Pressable accessibilityRole="button" onPress={pick} style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.brand, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 26 }}>📷</Text>
            <View style={{ flex: 1 }}><Text style={{ color: t.brand, fontWeight: '700' }}>Add photos</Text><Text style={{ color: t.muted, fontSize: 13 }}>Listings with photos get far more enquiries. {MAX_PHOTOS - photos.length} more allowed.</Text></View>
          </Pressable>
        ) : null}

        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>About you</Text>
        <Choice label="You are" value={f.posterIs} set={set('posterIs')} options={[{ code: 'OWNER', label: 'Owner or family' }, { code: 'DEALER', label: 'Dealer' }, { code: 'COMPANY', label: 'Company' }]} />
        <Field label="Your name" value={f.name ?? ''} onChangeText={set('name')} autoComplete="name" maxLength={80} />
        <Field label="Mobile number" value={f.phone ?? ''} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" maxLength={20} hint="Never shown. Our team calls you when a buyer asks about it." />
        <Tick on={consent} set={setConsent} label="I own this or have the owner’s permission to offer it, and what I have written is true." />
        {error ? <Text accessibilityRole="alert" style={{ color: t.danger }}>{error}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ok || state === 'busy' }} disabled={!ok || state === 'busy'} onPress={send} style={[s.btn, { backgroundColor: ok ? t.brand : t.line }]}><Text style={{ color: ok ? t.brandInk : t.muted, fontWeight: '700', fontSize: 16 }}>{state === 'busy' ? progress || 'Sending…' : 'Send for checking'}</Text></Pressable>
        {!ok ? <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center', marginTop: -8 }}>Fill in the state, district, town, size, your name and mobile, and tick the box.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

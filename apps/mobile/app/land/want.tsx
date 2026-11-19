import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Choice, Field, KIND_ICON, PURPOSE_ICON, Picker, Tick, phoneOk, s, states } from '../../components/Land';
import { getLandOptions, postLand, type LandOptions } from '../../lib/api';
import { rememberPost } from '../../lib/landposts';
import { useTheme } from '../../lib/theme';

/** A company or buyer says what land or space they need; owners with something that fits answer. */
export default function WantLand() {
  const t = useTheme();
  const router = useRouter();
  const [o, setO] = useState<LandOptions | null>(null);
  const [f, setF] = useState<Record<string, string>>({ purpose: 'WAREHOUSE', kind: 'INDUSTRIAL', deal: 'SALE', areaUnit: 'acre' });
  const [showCompany, setShowCompany] = useState(false);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');
  useEffect(() => { getLandOptions().then(setO).catch((e: Error) => setError(e.message)); }, []);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const pickPurpose = (p: string) => setF((x) => ({ ...x, purpose: p, ...(p === 'DARK_STORE' || p === 'RETAIL' ? { kind: 'BUILT', deal: 'LEASE', areaUnit: 'sqft' } : p === 'FARMING' ? { kind: 'FARM', areaUnit: 'acre' } : p === 'HOUSING' ? { kind: 'PLOT', areaUnit: 'sqyd' } : { kind: 'INDUSTRIAL', areaUnit: 'acre' }) }));
  if (!o) return error ? <Text style={{ color: t.danger, padding: 16 }}>{error}</Text> : <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  if (state === 'done') return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: t.readyBg, borderRadius: 16, padding: 16, gap: 6 }}>
        <Text style={{ color: t.ready, fontSize: 18, fontWeight: '800' }}>✓ Received</Text>
        <Text style={{ color: t.fg, lineHeight: 21 }}>Our team will check it, usually within a working day, and then owners can answer. You can see its status and close it from the Land screen on this phone.</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={[s.btn, { backgroundColor: t.brand }]}><Text style={{ color: t.brandInk, fontWeight: '700' }}>Back to land</Text></Pressable>
    </View>
  );
  const ok = !!f.state && Number(f.areaMin) > 0 && (f.name ?? '').trim().length > 1 && phoneOk(f.phone ?? '') && consent;
  const send = () => {
    setState('busy'); setError('');
    postLand('wanted', { ...f, showCompany }).then(async (r) => { await rememberPost(r.token); setState('done'); }).catch((e: Error) => { setError(e.message); setState('idle'); });
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.muted, lineHeight: 21 }}>Describe the land or space you need. Owners with something that fits answer, and our team sends you their details. Free.</Text>
        <Choice label="What is it for?" value={f.purpose} set={pickPurpose} options={o.purposes.map((p) => ({ ...p, icon: PURPOSE_ICON[p.code] }))} />
        <Choice label="What do you need?" value={f.kind} set={set('kind')} options={o.kinds.map((k) => ({ ...k, icon: KIND_ICON[k.code] }))} />
        <Choice label="You want to" value={f.deal} set={set('deal')} options={[{ code: 'SALE', label: 'Buy' }, { code: 'LEASE', label: 'Take on rent' }]} />

        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Where and how much</Text>
        <Picker label="State" value={f.state ?? ''} set={set('state')} options={states(o.states)} placeholder="Choose a state" />
        <Field label="Districts or towns (optional)" value={f.where ?? ''} onChangeText={set('where')} placeholder="e.g. Alwar, Bhiwadi, along NH-48" maxLength={160} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Smallest size" value={f.areaMin ?? ''} onChangeText={set('areaMin')} keyboardType="decimal-pad" placeholder="e.g. 2" /></View>
          <View style={{ flex: 1 }}><Field label="Largest (optional)" value={f.areaMax ?? ''} onChangeText={set('areaMax')} keyboardType="decimal-pad" /></View>
        </View>
        <Picker label="Unit" value={f.areaUnit} set={set('areaUnit')} options={o.units} />
        <Field label={f.deal === 'LEASE' ? 'Rent budget per month, in rupees (optional)' : 'Budget, in rupees (optional)'} value={f.budgetInr ?? ''} onChangeText={set('budgetInr')} keyboardType="number-pad" />
        <Field label="What it must have (optional)" value={f.details ?? ''} onChangeText={set('details')} multiline maxLength={1000} placeholder="e.g. 40 ft road for trailers, within 5 km of the highway" />

        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>About you</Text>
        <Field label="Company (optional)" value={f.company ?? ''} onChangeText={set('company')} maxLength={100} />
        <Tick on={showCompany} set={setShowCompany} label="Show the company name. Unticked, owners see only “A company”." />
        <Field label="Your name" value={f.name ?? ''} onChangeText={set('name')} autoComplete="name" maxLength={80} />
        <Field label="Mobile number" value={f.phone ?? ''} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" maxLength={20} hint="Never shown. Our team calls you when an owner answers." />
        <Tick on={consent} set={setConsent} label="This is a real requirement and I can be called about it." />
        {error ? <Text accessibilityRole="alert" style={{ color: t.danger }}>{error}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ok || state === 'busy' }} disabled={!ok || state === 'busy'} onPress={send} style={[s.btn, { backgroundColor: ok ? t.brand : t.line }]}><Text style={{ color: ok ? t.brandInk : t.muted, fontWeight: '700', fontSize: 16 }}>{state === 'busy' ? 'Sending…' : 'Send for checking'}</Text></Pressable>
        {!ok ? <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center', marginTop: -8 }}>Choose the state, give the smallest size, your name and mobile, and tick the box.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

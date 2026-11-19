import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Picker, s } from '../../components/Land';
import { useTheme } from '../../lib/theme';

/** Units with one size everywhere in India, in square feet. The same table the listings use. */
const UNITS: [code: string, label: string, sqft: number, where: string][] = [
  ['acre', 'Acre', 43_560, 'Used across India'],
  ['hectare', 'Hectare', 107_639, 'Government records'],
  ['sqft', 'Square foot', 1, 'Plots and buildings'],
  ['sqyd', 'Square yard (gaj)', 9, 'Plots in north India'],
  ['sqm', 'Square metre', 10.7639, 'Records and approvals'],
  ['guntha', 'Guntha', 1_089, 'Maharashtra, Karnataka, Telangana'],
  ['cent', 'Cent', 435.6, 'Kerala, Tamil Nadu, Andhra Pradesh'],
  ['kanal', 'Kanal', 5_445, 'Punjab, Haryana, Himachal, J&K'],
  ['ground', 'Ground', 2_400, 'Tamil Nadu'],
];
const show = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-IN') : n >= 1 ? String(Number(n.toFixed(2))) : String(Number(n.toPrecision(3))));

export default function LandArea() {
  const t = useTheme();
  const router = useRouter();
  const [value, setValue] = useState('1');
  const [unit, setUnit] = useState('acre');
  const n = Number(value);
  const sqft = Number.isFinite(n) && n > 0 ? n * UNITS.find((u) => u[0] === unit)![2] : 0;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.muted, lineHeight: 21 }}>Type a size and see it in every unit that means the same thing everywhere in India. Tap a result to convert from that unit.</Text>
        <View style={[s.panel, { backgroundColor: t.soft, borderColor: t.line, flexDirection: 'row' }]}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>Size</Text>
            <TextInput accessibilityLabel="Size" value={value} onChangeText={setValue} keyboardType="decimal-pad" style={[s.input, { borderColor: t.line, color: t.fg, backgroundColor: t.bg, fontSize: 20, fontWeight: '700' }]} />
          </View>
          <View style={{ flex: 1 }}><Picker label="Unit" value={unit} set={setUnit} options={UNITS.map(([code, label]) => ({ code, label }))} /></View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityLiveRegion="polite">
          {UNITS.filter((u) => u[0] !== unit).map(([code, label, size, where]) => (
            <Pressable key={code} accessibilityRole="button" accessibilityLabel={`${sqft ? show(sqft / size) : 'no value'} ${label}. Switch to ${label}`} onPress={() => { if (sqft) setValue(String(Number((sqft / size).toPrecision(8)))); setUnit(code); }} style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 1, backgroundColor: t.card, borderColor: pressed ? t.brand : t.line })}>
              <Text style={{ color: t.fg, fontSize: 21, fontWeight: '800' }}>{sqft ? show(sqft / size) : '—'}</Text>
              <Text style={{ color: t.fg, fontWeight: '600', fontSize: 13 }}>{label}</Text>
              <Text style={{ color: t.muted, fontSize: 11 }}>{where}</Text>
            </Pressable>
          ))}
        </View>
        <View style={[s.panel, { backgroundColor: t.bg === '#ffffff' ? '#fdf1dc' : '#2c2110', borderColor: t.bg === '#ffffff' ? '#f0cf96' : '#6b4a14' }]}>
          <Text style={{ color: t.fg, fontWeight: '700', lineHeight: 20 }}>Bigha, katha, biswa and marla are not here on purpose.</Text>
          <Text style={{ color: t.fg, lineHeight: 21, fontSize: 14 }}>Their size changes from state to state, and sometimes from one district to the next: a bigha can be anywhere from under a fifth of an acre to more than half. If a seller quotes one of these, ask what one unit is in that village in square feet or acres, and get it in writing, before you compare prices.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/land')} style={[s.btn, { backgroundColor: t.brand }]}><Text style={{ color: t.brandInk, fontWeight: '700' }}>Browse land and warehouses</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

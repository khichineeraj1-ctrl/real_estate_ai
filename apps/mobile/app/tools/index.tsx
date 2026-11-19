import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PriceField } from '../../components/tools/Calculators';
import { getCities, type CitySummary } from '../../lib/api';
import { LOAN_DEFAULTS, loanPlan } from '../../lib/finance';
import { num, price as short } from '../../lib/format';
import { useTheme, type Theme } from '../../lib/theme';

const rupees = (n: number) => `₹${num(Math.round(n))}`;

const TOOLS = [
  { href: '/tools/emi', icon: '🧮', ask: 'What will I pay each month?', name: 'EMI calculator', text: 'The monthly instalment on a home loan, and how much interest you pay.' },
  { href: '/tools/afford', icon: '🏠', ask: 'What is my budget?', name: 'How much home can I afford?', text: 'A budget from your income, existing EMIs and savings.' },
  { href: '/tools/cost', icon: '🧾', ask: 'What will I pay beyond the price?', name: 'True cost of buying', text: 'Stamp duty, registration and GST on top of the listed price, by city.' },
  { href: '/compare', icon: '⚖️', ask: 'Which one is better?', name: 'Compare', text: 'Projects, localities or homes side by side. Pick two and go.' },
] as const;

/** One slider, three quick answers. Each answer opens the full tool for the detail. */
function QuickLook({ t }: { t: Theme }) {
  const router = useRouter();
  const [amount, setAmount] = useState(10_000_000);
  const p = loanPlan(amount, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years);
  const answers = [
    { href: '/tools/emi', label: 'Monthly EMI', value: rupees(p.monthly), more: 'Change the rate and period →' },
    { href: '/tools/afford', label: 'Take-home pay you would need', value: `${rupees((p.monthly * 100) / LOAN_DEFAULTS.incomeSharePct)} a month`, more: 'Work out your own budget →' },
    { href: '/tools/cost', label: 'Down payment', value: short(p.downPayment), more: 'Plus stamp duty and fees. See them →' },
  ] as const;
  return (
    <View style={[s.panel, { backgroundColor: t.soft, borderColor: t.line }]}>
      <Text style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Pick a price. See what it means.</Text>
      <PriceField t={t} value={amount} onChange={setAmount} />
      <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
        {answers.map((a) => (
          <Pressable key={a.href} accessibilityRole="button" onPress={() => router.push(a.href)} style={({ pressed }) => [s.answer, { backgroundColor: t.bg, borderColor: pressed ? t.brand : t.line }]}>
            <Text style={{ color: t.muted, fontSize: 13 }}>{a.label}</Text>
            <Text style={{ color: t.fg, fontSize: 22, fontWeight: '800' }}>{a.value}</Text>
            <Text style={{ color: t.brand, fontSize: 13 }}>{a.more}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>Worked out with {LOAN_DEFAULTS.downPct}% down, an example rate of {LOAN_DEFAULTS.ratePct}% over {LOAN_DEFAULTS.years} years, and EMIs taking {LOAN_DEFAULTS.incomeSharePct}% of pay. Every tool lets you change these.</Text>
    </View>
  );
}

/** Choose a city and two of its localities, and open them side by side. */
function LocalityPicker({ t, cities }: { t: Theme; cities: CitySummary[] }) {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const [picked, setPicked] = useState<string[]>([]);
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) return null;
  const chip = (on: boolean) => [s.chip, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }];
  const tap = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug].slice(-2)));
  const ready = picked.length === 2;
  const name = (slug: string) => city.localities.find((l) => l.slug === slug)?.name;
  return (
    <View style={[s.panel, { backgroundColor: t.soft, borderColor: t.line }]}>
      <Text style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Compare two localities</Text>
      <View style={s.chips} accessibilityRole="radiogroup">
        {cities.map((c) => (
          <Pressable key={c.slug} accessibilityRole="radio" accessibilityState={{ selected: c.slug === citySlug }} onPress={() => { setCitySlug(c.slug); setPicked([]); }} style={chip(c.slug === citySlug)}>
            <Text style={{ color: c.slug === citySlug ? t.brandInk : t.fg, fontWeight: '600' }}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: t.muted, fontSize: 13 }}>Tap two localities in {city.name}.</Text>
      <View style={s.chips}>
        {city.localities.map((l) => {
          const on = picked.includes(l.slug);
          return (
            <Pressable key={l.slug} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => tap(l.slug)} style={chip(on)}>
              <Text style={{ color: on ? t.brandInk : t.fg }}>{on ? '✓ ' : ''}{l.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button" disabled={!ready} accessibilityState={{ disabled: !ready }}
        onPress={() => router.push({ pathname: '/compare-localities/[city]/[pair]', params: { city: city.slug, pair: [...picked].sort().join('-vs-') } })}
        style={[s.go, { backgroundColor: ready ? t.brand : t.line }]}
      >
        <Text style={{ color: ready ? t.brandInk : t.muted, fontWeight: '700' }}>{ready ? `Compare ${name(picked[0])} and ${name(picked[1])}` : picked.length === 1 ? 'Choose one more' : 'Choose two localities'}</Text>
      </Pressable>
    </View>
  );
}

export default function Tools() {
  const t = useTheme();
  const router = useRouter();
  const [cities, setCities] = useState<CitySummary[]>([]);
  useEffect(() => { getCities().then(setCities).catch(() => {}); }, []); // the picker simply stays hidden if the list cannot be loaded
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: t.muted, fontSize: 16, lineHeight: 23 }}>Buying a home is mostly arithmetic and comparison. These do the arithmetic.</Text>
      <QuickLook t={t} />
      {TOOLS.map((x) => (
        <Pressable key={x.href} accessibilityRole="button" accessibilityLabel={`${x.name}. ${x.text}`} onPress={() => router.push(x.href)} style={({ pressed }) => [s.card, { borderColor: pressed ? t.brand : t.line, backgroundColor: t.card, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <View style={[s.icon, { backgroundColor: t.soft }]}><Text style={{ fontSize: 22 }}>{x.icon}</Text></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: t.muted, fontSize: 12 }}>{x.ask}</Text>
            <Text style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>{x.name}</Text>
            <Text style={{ color: t.muted }}>{x.text}</Text>
          </View>
          <Text style={{ color: t.brand, fontSize: 20 }}>›</Text>
        </Pressable>
      ))}
      {cities.length > 0 && <LocalityPicker t={t} cities={cities} />}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  answer: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 2 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  go: { borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
});

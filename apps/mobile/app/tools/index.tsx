import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRICES, Slider } from '../../components/tools/Calculators';
import { LOAN_DEFAULTS, loanPlan } from '../../lib/finance';
import { num, price as short } from '../../lib/format';
import { useTheme, type Theme } from '../../lib/theme';

const rupees = (n: number) => `₹${num(Math.round(n))}`;

const TOOLS = [
  { href: '/tools/emi', icon: '🧮', name: 'EMI calculator', ask: 'What will I pay each month?' },
  { href: '/tools/afford', icon: '🏠', name: 'How much can I afford?', ask: 'What is my budget?' },
  { href: '/tools/cost', icon: '🧾', name: 'True cost of buying', ask: 'Stamp duty, registration and GST' },
  { href: '/tools/true-price', icon: '📐', name: 'True price of a quote', ask: 'Per carpet sq ft, and compare quotes' },
  { href: '/tools/delay-cost', icon: '⏳', name: 'Cost of a delay', ask: 'If possession runs late' },
] as const;
const COMPARE = [{ tab: 'projects', icon: '🏗️', label: 'Projects' }, { tab: 'localities', icon: '📍', label: 'Localities' }, { tab: 'homes', icon: '🏠', label: 'Homes' }] as const;

/** One slider, three quick answers. Each answer opens the full tool for the detail. */
function QuickLook({ t }: { t: Theme }) {
  const router = useRouter();
  const [amount, setAmount] = useState(10_000_000);
  const p = loanPlan(amount, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years);
  const answers = [
    { href: '/tools/emi', icon: '📅', label: 'Monthly EMI', value: rupees(p.monthly) },
    { href: '/tools/afford', icon: '💼', label: 'Monthly pay needed', value: rupees((p.monthly * 100) / LOAN_DEFAULTS.incomeSharePct) },
    { href: '/tools/cost', icon: '🧾', label: 'Down payment, before stamp duty', value: short(p.downPayment) },
  ] as const;
  return (
    <View style={[s.panel, { backgroundColor: t.soft, borderColor: t.line }]}>
      <View style={{ gap: 2 }}>
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>HOME PRICE</Text>
        <Text accessibilityLiveRegion="polite" style={{ color: t.fg, fontSize: 44, fontWeight: '800', letterSpacing: -1 }}>{short(amount)}</Text>
      </View>
      <Slider t={t} label="Home price" value={amount} min={1_000_000} max={50_000_000} step={100_000} onChange={setAmount} />
      <View style={s.chips}>
        {PRICES.map((x) => {
          const on = amount === x.value;
          return <Pressable key={x.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setAmount(x.value)} style={[s.chip, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }]}><Text style={{ color: on ? t.brandInk : t.fg, fontWeight: on ? '700' : '400', fontSize: 13 }}>{x.label}</Text></Pressable>;
        })}
      </View>
      <View style={{ gap: 6 }} accessible accessibilityLabel={`Loan ${short(p.loan)}, down payment ${short(p.downPayment)}`}>
        <View style={{ flexDirection: 'row', gap: 2, height: 10 }}>
          <View style={{ flex: 100 - LOAN_DEFAULTS.downPct, borderRadius: 4, backgroundColor: t.s1 }} />
          <View style={{ flex: LOAN_DEFAULTS.downPct, borderRadius: 4, backgroundColor: t.s2 }} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 2 }}>
          <Text style={{ color: t.muted, fontSize: 13 }}><Text style={{ color: t.s1 }}>■ </Text>Loan <Text style={{ color: t.fg, fontWeight: '700' }}>{short(p.loan)}</Text></Text>
          <Text style={{ color: t.muted, fontSize: 13 }}><Text style={{ color: t.s2 }}>■ </Text>Down payment <Text style={{ color: t.fg, fontWeight: '700' }}>{short(p.downPayment)}</Text></Text>
        </View>
      </View>
      <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
        {answers.map((a) => (
          <Pressable key={a.href} accessibilityRole="button" accessibilityLabel={`${a.label}: ${a.value}. Open the tool`} onPress={() => router.push(a.href)} style={({ pressed }) => [s.answer, { backgroundColor: t.card, borderColor: pressed ? t.brand : t.line, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <View style={[s.icon, { backgroundColor: t.soft }]}><Text style={{ fontSize: 20 }}>{a.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.muted, fontSize: 12 }}>{a.label}</Text>
              <Text style={{ color: t.fg, fontSize: 23, fontWeight: '800' }}>{a.value}</Text>
            </View>
            <View style={[s.arrow, { backgroundColor: t.soft }]}><Text style={{ color: t.brand, fontWeight: '700' }}>→</Text></View>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{LOAN_DEFAULTS.downPct}% down · {LOAN_DEFAULTS.ratePct}% example rate · {LOAN_DEFAULTS.years} years · EMI at {LOAN_DEFAULTS.incomeSharePct}% of pay. Tap a card to change these.</Text>
    </View>
  );
}

export default function Tools() {
  const t = useTheme();
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: t.muted, fontSize: 16 }}>Slide to a price and see what it means for you.</Text>
      <QuickLook t={t} />
      {TOOLS.map((x) => (
        <Pressable key={x.href} accessibilityRole="button" accessibilityLabel={`${x.name}. ${x.ask}`} onPress={() => router.push(x.href)} style={({ pressed }) => [s.card, { borderColor: pressed ? t.brand : t.line, backgroundColor: t.card, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <View style={[s.icon, { backgroundColor: t.soft }]}><Text style={{ fontSize: 20 }}>{x.icon}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.fg, fontSize: 16, fontWeight: '700' }}>{x.name}</Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>{x.ask}</Text>
          </View>
          <Text style={{ color: t.brand, fontWeight: '700' }}>→</Text>
        </Pressable>
      ))}
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 8 }}>Compare side by side</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {COMPARE.map((c) => (
          <Pressable key={c.tab} accessibilityRole="button" accessibilityLabel={`Compare ${c.label.toLowerCase()}`} onPress={() => router.push({ pathname: '/compare', params: { tab: c.tab } })} style={({ pressed }) => [s.vs, { borderColor: pressed ? t.brand : t.line, backgroundColor: t.card, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
            <Text style={{ fontSize: 24 }}>{c.icon}</Text>
            <Text style={{ color: t.fg, fontWeight: '600', fontSize: 13 }}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 14 },
  answer: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  vs: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 4 },
});

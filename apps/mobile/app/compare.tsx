import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompareStudio } from '../components/tools/CompareStudio';
import { Cover } from '../components/Cover';
import { InsightList, ScoreChecks, ScoreTag, insightSummary, toneOf } from '../components/Insights';
import { getHomeInsights, type CompareHome, type Insight, type Scorecard } from '../lib/api';
import { LOAN_DEFAULTS, buyingCosts, loanPlan } from '../lib/finance';
import { num, price, statusLabel, typeLabel } from '../lib/format';
import { useTheme } from '../lib/theme';

const COL = 170;

export default function Compare() {
  const t = useTheme();
  const router = useRouter();
  const { ids, tab } = useLocalSearchParams<{ ids?: string; tab?: string }>();
  const [homes, setHomes] = useState<CompareHome[] | null>(null);
  const [cards, setCards] = useState<Scorecard[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ids) { setHomes([]); return; }
    setHomes(null);
    getHomeInsights(ids.split(',')).then((d) => { setCards(d.scorecards); setInsights(d.insights); setHomes(d.homes); }).catch((e: Error) => setError(e.message));
  }, [ids]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!homes) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  if (homes.length < 2) return <><Stack.Screen options={{ title: 'Compare' }} /><CompareStudio start={tab === 'localities' || tab === 'homes' ? tab : 'projects'} /></>;

  const perSqft = (h: CompareHome) => Math.round(h.priceInr / h.areaSqft);
  const vsArea = (h: CompareHome) => (h.localityStats.avgRate ? Math.round(((perSqft(h) - h.localityStats.avgRate) / h.localityStats.avgRate) * 100) : null);
  const total = (h: CompareHome) => (h.costs ? buyingCosts(h.priceInr, h.costs, { underConstruction: h.status === 'UNDER_CONSTRUCTION' }).total : null);
  const emi = (h: CompareHome) => loanPlan(h.priceInr, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years).monthly;
  // The best value in a row (lowest or highest), unless every home ties.
  const best = (values: (number | null)[], lowest: boolean) => {
    const real = values.filter((v): v is number => v != null);
    if (real.length < 2 || real.every((v) => v === real[0])) return null;
    return lowest ? Math.min(...real) : Math.max(...real);
  };
  const numeric = (label: string, values: (number | null)[], show: (v: number, i: number) => string, lowest: boolean) => {
    const b = best(values, lowest);
    return { label, cells: values.map((v, i) => (v == null ? '—' : show(v, i))), marks: values.map((v) => b != null && v === b) };
  };
  const plain = (label: string, cells: string[]) => ({ label, cells, marks: cells.map(() => false) });
  const rows = [
    numeric('Price', homes.map((h) => h.priceInr), (v) => price(v), true),
    numeric('Rate per sq ft', homes.map(perSqft), (v) => `₹${num(v)}`, true),
    numeric('Against the area average', homes.map(vsArea), (v) => (v === 0 ? 'Same' : `${Math.abs(v)}% ${v > 0 ? 'above' : 'below'}`), true),
    numeric('Area', homes.map((h) => h.areaSqft), (v) => `${num(v)} sq ft`, false),
    numeric('Total cost to buy (estimate)', homes.map(total), (v) => price(v), true),
    numeric('Monthly EMI (example)', homes.map(emi), (v) => `₹${num(v)}`, true),
    plain('Bedrooms', homes.map((h) => (h.bhk ? `${h.bhk} BHK` : '—'))),
    plain('Type', homes.map((h) => typeLabel(h.type))),
    plain('Status', homes.map((h) => statusLabel(h.status))),
    plain('Locality', homes.map((h) => `${h.locality.name}, ${h.city.name}`)),
    plain('Project', homes.map((h) => h.project?.name ?? '—')),
    plain('Floor', homes.map((h) => (h.floor != null ? `${h.floor} of ${h.totalFloors}` : '—'))),
    plain('Facing', homes.map((h) => h.facing ?? '—')),
    plain('Furnishing', homes.map((h) => h.furnishing ?? '—')),
    plain('Amenities', homes.map((h) => (h.amenities.length ? h.amenities.join(', ') : '—'))),
  ];

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 21, fontWeight: '700', paddingHorizontal: 16 }}>Comparing {homes.length} homes</Text>
      <Text style={{ color: t.muted, fontSize: 15, paddingHorizontal: 16 }}>{insights.length ? insightSummary(insights) : 'On the figures listed, nothing separates these; the table below has every detail.'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
        {homes.map((h, i) => {
          const card = cards[i]; if (!card) return null;
          return (
            <View key={h.slug} style={[s.card, { backgroundColor: t.card, borderColor: t.line, borderTopColor: toneOf(t, card.tag.tone).ink }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Open ${h.title}`} onPress={() => router.push({ pathname: '/property/[slug]', params: { slug: h.slug } })} style={{ gap: 4 }}>
                {h.photos?.[0] ? <Cover photo={h.photos[0]} label={`${h.title}: photo`} /> : null}
                <ScoreTag tag={card.tag} />
                <Text style={{ color: t.fg, fontSize: 16, fontWeight: '700' }}>{h.title}</Text>
                <Text numberOfLines={1} style={{ color: t.muted, fontSize: 13 }}>{h.bhk ? `${h.bhk} BHK · ` : ''}{num(h.areaSqft)} sq ft · {h.locality.name}</Text>
              </Pressable>
              <ScoreChecks checks={card.checks} />
            </View>
          );
        })}
      </ScrollView>
      {insights.length > 0 ? <View style={{ paddingHorizontal: 16 }}><InsightList insights={insights} /></View> : null}
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginTop: 6 }}>Every fact, side by side</Text>
      <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 16 }}>
        <View>
          <View style={s.line}>
            {homes.map((h) => (
              <Pressable key={h.slug} accessibilityRole="button" onPress={() => router.push({ pathname: '/property/[slug]', params: { slug: h.slug } })} style={[s.cell, s.head, { borderColor: t.line }]}>
                <Text style={{ color: t.brand, fontWeight: '700' }}>{h.title}</Text>
              </Pressable>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.label}>
              <Text style={[s.label, { color: t.muted, backgroundColor: t.soft }]}>{r.label}</Text>
              <View style={s.line}>
                {r.cells.map((c, i) => (
                  <View key={homes[i].slug} style={[s.cell, { borderColor: t.line, backgroundColor: r.marks[i] ? t.readyBg : 'transparent' }]} accessibilityLabel={`${r.label}, ${homes[i].title}: ${c}${r.marks[i] ? ', best' : ''}`}>
                    <Text style={{ color: r.marks[i] ? t.ready : t.fg, fontWeight: r.marks[i] ? '700' : '400' }}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17, paddingHorizontal: 16 }}>The best figure in each row is highlighted. EMI assumes {LOAN_DEFAULTS.downPct}% down, {LOAN_DEFAULTS.ratePct}% interest and {LOAN_DEFAULTS.years} years; total cost adds estimated stamp duty, registration and GST. The notes above are arithmetic on what sellers listed and what we have verified, not a valuation or advice.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { width: 250, borderWidth: 1, borderTopWidth: 4, borderRadius: 16, padding: 12, gap: 8 },
  line: { flexDirection: 'row' },
  cell: { width: COL, padding: 10, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { justifyContent: 'flex-end', minHeight: 70 },
  label: { paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '600' },
});

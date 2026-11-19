import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cover } from '../components/Cover';
import { CompareStudio } from '../components/tools/CompareStudio';
import { ConnectButton } from '../components/LeadForm';
import { InsightList, ScoreChecks, ScoreTag, insightSummary, toneOf } from '../components/Insights';
import { getProjectInsights, type CompareProject, type Insight, type Scorecard } from '../lib/api';
import { monthYear, num, price } from '../lib/format';
import { useTheme } from '../lib/theme';

const COL = 180;
/** Where a registration stands today, from the register's own status and end date. */
function standing(p: CompareProject): { key: 'current' | 'ended' | 'lapsed' | 'unknown'; text: string } {
  if (/lapsed/i.test(p.registerStatus ?? '')) return { key: 'lapsed', text: 'Marked lapsed by the register' };
  if (!p.registerValidUntil) return { key: 'unknown', text: p.reraId ? 'Registered' : 'Not on a register we read' };
  return new Date(p.registerValidUntil) < new Date() ? { key: 'ended', text: 'Registration period over' } : { key: 'current', text: 'Registration current' };
}

export default function CompareProjects() {
  const t = useTheme();
  const router = useRouter();
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const [ps, setPs] = useState<CompareProject[] | null>(null);
  const [cards, setCards] = useState<Scorecard[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ids) { setPs([]); return; }
    setPs(null);
    getProjectInsights(ids.split(',')).then((d) => { setCards(d.scorecards); setInsights(d.insights); setPs(d.projects); }).catch((e: Error) => setError(e.message));
  }, [ids]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!ps) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  if (ps.length < 2) return <CompareStudio />;

  const st = ps.map(standing);
  const differ = (flags: boolean[]) => (flags.some(Boolean) && !flags.every(Boolean) ? flags : undefined);
  const most = (values: number[]) => { const top = Math.max(...values); return differ(values.map((v) => v === top && top > 0)); };
  const rows: { label: string; cells: string[]; marks?: boolean[] }[] = [
    { label: 'Where', cells: ps.map((p) => `${p.locality.name}, ${p.city.name}`) },
    { label: 'Builder', cells: ps.map((p) => p.brand?.name ?? p.builder) },
    { label: 'Registered by', cells: ps.map((p) => p.builder) },
    { label: 'Builder’s registered projects in the city', cells: ps.map((p) => num(p.builderProjects)), marks: most(ps.map((p) => p.builderProjects)) },
    { label: 'RERA registration', cells: st.map((x) => x.text), marks: differ(st.map((x) => x.key === 'current')) },
    { label: 'Registration runs to', cells: ps.map((p) => monthYear(p.registerValidUntil) ?? '—') },
    { label: 'RERA number', cells: ps.map((p) => p.reraId ?? '—') },
    { label: 'Homes for sale here', cells: ps.map((p) => (p.homes ? `${p.homes}, from ${price(p.stats.minPrice)}` : 'None listed yet')), marks: most(ps.map((p) => p.homes)) },
    { label: 'Price', cells: ps.map((p) => (p.stats.count ? `${price(p.stats.minPrice)} to ${price(p.stats.maxPrice)}` : 'Ask for a call back')) },
    { label: 'Agents we have verified', cells: ps.map((p) => (p.agents?.length ? `${p.agents.length} (${p.agents.map((a) => a.name).join(', ')})` : 'None yet')), marks: most(ps.map((p) => p.agents?.length ?? 0)) },
    { label: 'The locality is known for', cells: ps.map((p) => (p.highlights.length ? p.highlights.join('\n') : '—')) },
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 21, fontWeight: '700' }}>Comparing {ps.length} projects</Text>
      <Text style={{ color: t.muted, fontSize: 15 }}>{insightSummary(insights)}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
        {ps.map((p, i) => {
          const card = cards[i]; if (!card) return null;
          const tag = toneOf(t, card.tag.tone);
          return (
            <View key={p.slug} style={[s.card, { backgroundColor: t.card, borderColor: t.line, borderTopColor: tag.ink }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Open ${p.name}`} onPress={() => router.push({ pathname: '/project/[slug]', params: { slug: p.slug } })} style={{ gap: 4 }}>
                {p.photos?.[0] ? <Cover photo={p.photos[0]} label={`${p.name}: photo`} /> : null}
                <ScoreTag tag={card.tag} />
                <Text style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>{p.name}</Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>{p.brand?.name ?? p.builder} · {p.locality.name}</Text>
              </Pressable>
              <ScoreChecks checks={card.checks} />
              <ConnectButton kind="project" slug={p.slug} name={p.name} mode={p.agents?.length ? 'agent' : 'callback'} agents={p.agents?.length} unclaimed={!!p.registerSource} />
            </View>
          );
        })}
      </ScrollView>

      <InsightList insights={insights} />

      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 6 }}>Every fact, side by side</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexDirection: 'column' }}>
        <View style={s.line}>
          {ps.map((p) => (
            <Pressable key={p.slug} accessibilityRole="button" onPress={() => router.push({ pathname: '/project/[slug]', params: { slug: p.slug } })} style={[s.cell, { gap: 4 }]}>
              <Text style={{ color: t.brand, fontWeight: '700' }}>{p.name}</Text>
              {p.photos?.[0] ? <Cover photo={p.photos[0]} label={`${p.name}: photo`} /> : null}
            </Pressable>
          ))}
        </View>
        {rows.map((r) => (
          <View key={r.label} style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.line }}>
            <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingTop: 8 }}>{r.label}</Text>
            <View style={s.line}>
              {r.cells.map((c, i) => (
                <Text key={ps[i].slug} accessibilityLabel={`${r.label}, ${ps[i].name}: ${c}${r.marks?.[i] ? ', stands out' : ''}`} style={[s.cell, { color: r.marks?.[i] ? t.ready : t.fg, fontWeight: r.marks?.[i] ? '700' : '400', backgroundColor: r.marks?.[i] ? t.readyBg : 'transparent' }]}>{c}</Text>
              ))}
            </View>
          </View>
        ))}
        <View style={[s.line, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.line, paddingTop: 10 }]}>
          {ps.map((p) => <View key={p.slug} style={s.cell}><ConnectButton kind="project" slug={p.slug} name={p.name} mode={p.agents?.length ? 'agent' : 'callback'} agents={p.agents?.length} unclaimed={!!p.registerSource} /></View>)}
        </View>
      </ScrollView>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>These notes are worked out from the public RERA registers and from homes listed with us; they are not advice or a rating. A registration’s end date is the completion date the builder gave RERA, not a possession date.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { width: 250, borderWidth: 1, borderTopWidth: 4, borderRadius: 16, padding: 12, gap: 10 },
  line: { flexDirection: 'row' },
  cell: { width: COL, padding: 8, fontSize: 14, lineHeight: 20 },
});

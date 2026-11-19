import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cover } from '../components/Cover';
import { ConnectButton } from '../components/LeadForm';
import { getCompareProjects, type CompareProject } from '../lib/api';
import { monthYear, num, price } from '../lib/format';
import { useTheme } from '../lib/theme';

const COL = 180;
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

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
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ids) { setPs([]); return; }
    setPs(null);
    getCompareProjects(ids.split(',')).then(setPs).catch((e: Error) => setError(e.message));
  }, [ids]);

  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!ps) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  if (ps.length < 2) {
    return (
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: t.fg, fontSize: 20, fontWeight: '700' }}>Compare builder projects</Text>
        <Text style={{ color: t.muted, fontSize: 16, lineHeight: 23 }}>Choose two to four projects: tap “⇄ Compare” on any project, then “Compare” in the bar that appears.</Text>
      </View>
    );
  }

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
  const current = ps.filter((_, i) => st[i].key === 'current'); const lapsed = ps.filter((_, i) => st[i].key === 'lapsed'); const ended = ps.filter((_, i) => st[i].key === 'ended');
  const verdict = [
    new Set(ps.map((p) => p.locality.slug)).size === 1 ? `All ${ps.length} are in ${ps[0].locality.name}, ${ps[0].city.name}.` : `They are in ${list([...new Set(ps.map((p) => `${p.locality.name}, ${p.city.name}`))])}.`,
    current.length === ps.length ? 'Every one has a RERA registration that is still running.' : current.length ? `${list(current.map((p) => p.name))} ${current.length === 1 ? 'has a registration' : 'have registrations'} still running.` : '',
    ended.length ? `${list(ended.map((p) => p.name))} ${ended.length === 1 ? 'is' : 'are'} past the end of the registration period, which often means the building is complete; confirm with the builder.` : '',
    lapsed.length ? `${list(lapsed.map((p) => p.name))} ${lapsed.length === 1 ? 'is' : 'are'} marked lapsed by the register: ask the builder about this before paying anything.` : '',
  ].filter(Boolean).join(' ');

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 21, fontWeight: '700' }}>Comparing {ps.length} projects</Text>
      <Text style={{ color: t.fg, fontSize: 15, lineHeight: 22 }}>{verdict}</Text>
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
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>Registration facts are as published on the public RERA registers, which give no prices. A highlighted cell is where the projects differ, not a recommendation.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  line: { flexDirection: 'row' },
  cell: { width: COL, padding: 8, fontSize: 14, lineHeight: 20 },
});

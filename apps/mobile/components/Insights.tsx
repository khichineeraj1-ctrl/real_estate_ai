import { StyleSheet, Text, View } from 'react-native';
import type { Insight, Scorecard, Tone } from '../lib/api';
import { useTheme, type Theme } from '../lib/theme';

const MARK: Record<Tone, string> = { good: '✓', warn: '!', info: 'i', none: '–' };

/** The ink and wash for a tone: green for good, amber for something to check, brand for a plain note. */
export function toneOf(t: Theme, k: Tone): { ink: string; bg: string } {
  const dark = t.bg !== '#ffffff';
  if (k === 'good') return { ink: t.ready, bg: t.readyBg };
  if (k === 'warn') return dark ? { ink: '#fdb022', bg: '#2b2110' } : { ink: '#b54708', bg: '#fff4e5' };
  if (k === 'info') return { ink: t.brand, bg: t.soft };
  return { ink: t.muted, bg: t.soft };
}

/** The coloured verdict at the top of a scorecard. */
export function ScoreTag({ tag }: { tag: Scorecard['tag'] }) {
  const k = toneOf(useTheme(), tag.tone);
  return <View style={{ alignSelf: 'flex-start', backgroundColor: k.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Text style={{ color: k.ink, fontSize: 12, fontWeight: '700' }}>{tag.text}</Text></View>;
}

/** A scorecard's checks: a mark, what was checked, and what we found. */
export function ScoreChecks({ checks }: { checks: Scorecard['checks'] }) {
  const t = useTheme();
  return (
    <View>
      {checks.map((c) => {
        const k = toneOf(t, c.tone);
        return (
          <View key={c.label} accessible accessibilityLabel={`${c.label}: ${c.text}`} style={[s.check, { borderColor: t.line }]}>
            <View style={[s.mark, { backgroundColor: k.bg }]}><Text style={{ color: k.ink, fontSize: 11, fontWeight: '800' }}>{MARK[c.tone]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.muted, fontSize: 12 }}>{c.label}</Text>
              <Text style={{ color: c.tone === 'none' ? t.muted : t.fg, fontSize: 14, fontWeight: c.tone === 'none' ? '400' : '600' }}>{c.text}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** How many notes there are, in a line. */
export const insightSummary = (insights: Insight[]) => {
  const w = insights.filter((x) => x.tone === 'warn').length;
  return w ? `${w} thing${w === 1 ? '' : 's'} to check before you choose, and ${insights.length - w} more worth knowing.` : `${insights.length} things worth knowing before you choose.`;
};

/** "What separates them": the notes, warnings first. */
export function InsightList({ insights }: { insights: Insight[] }) {
  const t = useTheme();
  const ordered = [...insights.filter((x) => x.tone === 'warn'), ...insights.filter((x) => x.tone !== 'warn')];
  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 6 }}>What separates them</Text>
      {ordered.map((x) => {
        const k = toneOf(t, x.tone);
        return (
          <View key={x.key} style={[s.insight, { backgroundColor: k.bg, borderColor: x.tone === 'warn' ? k.ink : t.line }]}>
            <View style={[s.icon, { backgroundColor: t.card }]}><Text style={{ fontSize: 19 }}>{x.icon}</Text></View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: x.tone === 'warn' ? k.ink : t.fg, fontSize: 15, fontWeight: '700' }}>{x.title}</Text>
              <Text style={{ color: t.fg, fontSize: 14, lineHeight: 20 }}>{x.text}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  check: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  insight: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

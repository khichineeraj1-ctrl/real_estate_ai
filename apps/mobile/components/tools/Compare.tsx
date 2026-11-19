import { usePathname, useRouter } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../../lib/theme';

/**
 * The buyer's shortlists to compare side by side: one of homes, one of builder projects, up to four each. Kept in
 * memory, so they last while the app is open and are forgotten when it is closed; nothing is stored or sent anywhere.
 */
export const MAX_COMPARE = 4;
export type Kind = 'homes' | 'projects';
/** `sub` and `image` are kept when the picker knows them, so the board can show more than a name. */
export interface Pick { slug: string; title: string; sub?: string; image?: string }
export const setPicks = (kind: Kind, next: Pick[]) => set(kind, next.slice(0, MAX_COMPARE));
const lists: Record<Kind, Pick[]> = { homes: [], projects: [] };
const WORD: Record<Kind, [string, string]> = { homes: ['home', 'homes'], projects: ['project', 'projects'] };
const listeners = new Set<() => void>();
const set = (kind: Kind, next: Pick[]) => { lists[kind] = next; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const usePicks = (kind: Kind) => useSyncExternalStore(subscribe, () => lists[kind], () => lists[kind]);

/** `fill` shares a row evenly with the button beside it, at the same height. */
export function CompareToggle({ slug, title, kind = 'homes', fill }: Pick & { kind?: Kind; fill?: boolean }) {
  const t = useTheme();
  const chosen = usePicks(kind);
  const on = chosen.some((p) => p.slug === slug);
  const full = !on && chosen.length >= MAX_COMPARE;
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ selected: on, disabled: full }} disabled={full}
      accessibilityLabel={on ? `Remove ${title} from comparison` : full ? 'Comparison is full' : `Add ${title} to comparison`}
      // The list is read as it is now, so two quick taps on different cards both count.
      onPress={() => { const now = lists[kind]; const has = now.some((p) => p.slug === slug); if (has || now.length < MAX_COMPARE) set(kind, has ? now.filter((p) => p.slug !== slug) : [...now, { slug, title }]); }}
      style={[s.toggle, fill && s.fill, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : fill ? t.soft : 'transparent' }]}
    >
      <Text numberOfLines={fill ? 1 : undefined} style={{ color: on ? t.brandInk : full ? t.muted : t.brand, fontSize: fill ? 14 : 13, fontWeight: fill ? '700' : '600' }}>{on ? (fill ? '✓ Added' : '✓ In comparison') : full ? (fill ? 'Full' : 'Comparison is full') : '⇄ Compare'}</Text>
    </Pressable>
  );
}

function Row({ kind, t }: { kind: Kind; t: Theme }) {
  const router = useRouter();
  const chosen = usePicks(kind);
  if (chosen.length === 0) return null;
  const [one, many] = WORD[kind];
  return (
    <View style={s.row} accessibilityLabel={`${many} chosen to compare`}>
      <Text style={{ color: t.fg, flexShrink: 1 }} numberOfLines={1}><Text style={{ fontWeight: '700' }}>{chosen.length}</Text> of {MAX_COMPARE} {chosen.length === 1 ? one : many}</Text>
      {chosen.length > 1 ? (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: kind === 'projects' ? '/compare-projects' : '/compare', params: { ids: chosen.map((p) => p.slug).join(',') } })} style={[s.go, { backgroundColor: t.brand }]}>
          <Text style={{ color: t.brandInk, fontWeight: '700' }}>Compare</Text>
        </Pressable>
      ) : <Text style={{ color: t.muted, fontSize: 13 }}>Add one more</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel={`Clear the ${many} chosen`} onPress={() => set(kind, [])} hitSlop={8}><Text style={{ color: t.muted }}>Clear</Text></Pressable>
    </View>
  );
}

/** Floats above every screen once something is shortlisted. */
export function CompareBar() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const any = usePicks('homes').length + usePicks('projects').length;
  // On a comparison itself the bar would only cover the table.
  if (!any || path.startsWith('/compare')) return null;
  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: Math.max(insets.bottom, 12) + 76 }]}>
      <View style={[s.bar, { backgroundColor: t.card, borderColor: t.brand }]}>
        <Row kind="projects" t={t} />
        <Row kind="homes" t={t} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { alignSelf: 'stretch', flexGrow: 1, flexBasis: 104, paddingHorizontal: 8, minHeight: 40, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  toggle: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: { gap: 6, borderWidth: 1.5, borderRadius: 22, paddingVertical: 8, paddingLeft: 18, paddingRight: 14, maxWidth: '94%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  go: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
});

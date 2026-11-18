import { useRouter } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';

/**
 * The buyer's shortlist of homes to compare, up to four. Kept in memory, so it lasts while the app is open and is
 * forgotten when the app is closed; nothing is stored on the phone or sent anywhere.
 */
export const MAX_COMPARE = 4;
interface Pick { slug: string; title: string }
let picks: Pick[] = [];
const listeners = new Set<() => void>();
const set = (next: Pick[]) => { picks = next; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const usePicks = () => useSyncExternalStore(subscribe, () => picks, () => picks);

export function CompareToggle({ slug, title }: Pick) {
  const t = useTheme();
  const chosen = usePicks();
  const on = chosen.some((p) => p.slug === slug);
  const full = !on && chosen.length >= MAX_COMPARE;
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ selected: on, disabled: full }} disabled={full}
      accessibilityLabel={on ? `Remove ${title} from comparison` : full ? 'Comparison is full' : `Add ${title} to comparison`}
      onPress={() => set(on ? chosen.filter((p) => p.slug !== slug) : [...chosen, { slug, title }])}
      style={[s.toggle, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : 'transparent' }]}
    >
      <Text style={{ color: on ? t.brandInk : full ? t.muted : t.brand, fontSize: 13 }}>{on ? '✓ In comparison' : full ? 'Comparison is full' : '+ Compare'}</Text>
    </Pressable>
  );
}

/** Floats above every screen once at least one home is shortlisted. */
export function CompareBar() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const chosen = usePicks();
  if (chosen.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: Math.max(insets.bottom, 12) + 76 }]}>
      <View style={[s.bar, { backgroundColor: t.card, borderColor: t.brand }]} accessibilityLabel="Homes chosen to compare">
        <Text style={{ color: t.fg }}>{chosen.length} of {MAX_COMPARE} chosen</Text>
        {chosen.length > 1 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/compare', params: { ids: chosen.map((p) => p.slug).join(',') } })} style={[s.go, { backgroundColor: t.brand }]}>
            <Text style={{ color: t.brandInk, fontWeight: '700' }}>Compare</Text>
          </Pressable>
        ) : <Text style={{ color: t.muted, fontSize: 13 }}>Add one more</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Clear the comparison" onPress={() => set([])} hitSlop={8}><Text style={{ color: t.muted }}>Clear</Text></Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  toggle: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingLeft: 18, paddingRight: 14 },
  go: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
});

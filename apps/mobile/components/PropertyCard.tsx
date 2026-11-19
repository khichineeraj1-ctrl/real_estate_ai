import { Cover } from './Cover';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CONFIDENCE_LABELS, photoUrl, type PropertyCard as Card } from '../lib/api';
import { num, price, statusLabel, typeLabel } from '../lib/format';
import { useTheme } from '../lib/theme';
import { ConnectButton } from './LeadForm';
import { CompareToggle } from './tools/Compare';

export function PropertyCard({ p }: { p: Card }) {
  const t = useTheme();
  const router = useRouter();
  const ready = p.status === 'READY_TO_MOVE';
  return (
    // The card is a plain box holding two separate buttons (open the home, add to comparison): one button inside another is not valid.
    <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
      <Pressable
        accessibilityRole="button" accessibilityLabel={`${p.title}, ${price(p.priceInr)}`}
        onPress={() => router.push({ pathname: '/property/[slug]', params: { slug: p.slug } })}
        style={({ pressed }) => [s.open, { opacity: pressed ? 0.6 : 1 }]}
      >
      {p.photos?.[0] && <Cover photo={p.photos[0]} label={`${p.title}: photo`} />}
      <View style={s.top}>
        <Text style={[s.price, { color: t.fg }]}>{price(p.priceInr)}</Text>
        <Text style={[s.tag, { color: ready ? t.ready : t.muted, backgroundColor: ready ? t.readyBg : t.soft }]}>{statusLabel(p.status)}</Text>
      </View>
      <Text style={[s.title, { color: t.fg }]}>{p.title}</Text>
      {p.confidence != null && <Text style={[s.conf, { color: (p.confidence ?? 0) >= 2 ? t.ready : t.muted, backgroundColor: (p.confidence ?? 0) >= 2 ? t.readyBg : t.soft }]}>{(p.confidence ?? 0) >= 2 ? '✓ ' : ''}{CONFIDENCE_LABELS[p.confidence]}</Text>}
      <Text style={{ color: t.muted, fontSize: 13 }}>
        {[typeLabel(p.type), p.bhk ? `${p.bhk} BHK` : null, `${num(p.areaSqft)} sq ft`, `₹${num(Math.round(p.priceInr / p.areaSqft))}/sq ft`].filter(Boolean).join('  ·  ')}
      </Text>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <ConnectButton kind="property" slug={p.slug} name={p.title} mode={p.listedBy === 'BUILDER' ? 'callback' : 'seller'} />
        <CompareToggle slug={p.slug} title={p.title} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  open: { gap: 6 },
  photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: 10, marginBottom: 4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 19, fontWeight: '700' },
  tag: { fontSize: 12, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  conf: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
});

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { useTheme } from '../../lib/theme';

const TOOLS = [
  { href: '/tools/emi', name: 'EMI calculator', text: 'The monthly instalment on a home loan, and how much interest you pay.' },
  { href: '/tools/afford', name: 'How much home can I afford?', text: 'A budget from your income, existing EMIs and savings.' },
  { href: '/tools/cost', name: 'True cost of buying', text: 'Stamp duty, registration and GST on top of the listed price, by city.' },
  { href: '/compare', name: 'Compare homes', text: 'Up to four listings side by side. Tap “+ Compare” on any home to choose them.' },
] as const;

export default function Tools() {
  const t = useTheme();
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: t.muted, fontSize: 16, lineHeight: 23 }}>Buying a home is mostly arithmetic and comparison. These do the arithmetic.</Text>
      {TOOLS.map((x) => (
        <Pressable key={x.href} accessibilityRole="button" onPress={() => router.push(x.href)} style={({ pressed }) => ({ borderWidth: 1, borderColor: pressed ? t.brand : t.line, backgroundColor: t.card, borderRadius: 16, padding: 16, gap: 4 })}>
          <Text style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>{x.name}</Text>
          <Text style={{ color: t.muted }}>{x.text}</Text>
        </Pressable>
      ))}
      <Text style={{ color: t.muted }}>To compare two areas, open a locality from Browse and pick one under “Compare with”.</Text>
    </ScrollView>
  );
}

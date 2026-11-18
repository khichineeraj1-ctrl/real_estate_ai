import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { CostCalculator } from '../../components/tools/Calculators';
import { getCities, type CitySummary } from '../../lib/api';
import { useTheme } from '../../lib/theme';

export default function Cost() {
  const t = useTheme();
  const [cities, setCities] = useState<CitySummary[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getCities().then(setCities).catch((e: Error) => setError(e.message)); }, []);
  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!cities) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.muted, fontSize: 16, lineHeight: 23 }}>The listed price is not what you pay. Government charges add several percent, and differ by city and by whether the home is finished.</Text>
        <CostCalculator cities={cities.map((c) => ({ slug: c.slug, name: c.name, costs: c.costs }))} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

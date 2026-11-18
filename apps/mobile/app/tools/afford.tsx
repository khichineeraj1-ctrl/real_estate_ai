import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { AffordabilityCalculator } from '../../components/tools/Calculators';
import { useTheme } from '../../lib/theme';

export default function Afford() {
  const t = useTheme();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.muted, fontSize: 16, lineHeight: 23 }}>A budget based on what a lender would usually let you repay each month, plus what you have saved.</Text>
        <AffordabilityCalculator />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

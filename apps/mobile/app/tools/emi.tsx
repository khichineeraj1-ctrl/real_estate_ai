import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { EmiCalculator } from '../../components/tools/Calculators';
import { useTheme } from '../../lib/theme';

export default function Emi() {
  const t = useTheme();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.muted, fontSize: 16, lineHeight: 23 }}>Enter the price of the home and how you plan to pay for it. The instalment updates as you type.</Text>
        <EmiCalculator />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

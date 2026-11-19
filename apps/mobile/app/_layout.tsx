import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CompareBar } from '../components/tools/Compare';
import { BRAND } from '../lib/config';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: t.card }, headerTintColor: t.brand, headerTitleStyle: { color: t.fg }, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="index" options={{ title: BRAND }} />
        <Stack.Screen name="browse" options={{ title: 'Browse by city' }} />
        <Stack.Screen name="locality/[city]/[slug]" options={{ title: 'Locality' }} />
        <Stack.Screen name="property/[slug]" options={{ title: 'Property' }} />
        <Stack.Screen name="project/[slug]" options={{ title: 'Project' }} />
        <Stack.Screen name="builders/[city]" options={{ title: 'Builders' }} />
        <Stack.Screen name="builder/[city]/[slug]" options={{ title: 'Builder' }} />
        <Stack.Screen name="tools/index" options={{ title: 'Tools to help you decide' }} />
        <Stack.Screen name="tools/emi" options={{ title: 'EMI calculator' }} />
        <Stack.Screen name="tools/afford" options={{ title: 'How much can I afford?' }} />
        <Stack.Screen name="tools/cost" options={{ title: 'True cost of buying' }} />
        <Stack.Screen name="compare" options={{ title: 'Compare homes' }} />
        <Stack.Screen name="compare-projects" options={{ title: 'Compare projects' }} />
        <Stack.Screen name="compare-localities/[city]/[pair]" options={{ title: 'Compare localities' }} />
      </Stack>
      <CompareBar />
    </SafeAreaProvider>
  );
}

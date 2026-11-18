import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
      </Stack>
    </SafeAreaProvider>
  );
}

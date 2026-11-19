import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAccount } from '../components/Account';
import { CompareBar } from '../components/tools/Compare';
import { BRAND } from '../lib/config';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const t = useTheme();
  // On launch a stored sign-in is checked once with the server, so a session that has ended does not linger.
  useAccount();
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
        <Stack.Screen name="tools/true-price" options={{ title: 'True price of a quote' }} />
        <Stack.Screen name="tools/delay-cost" options={{ title: 'Cost of a delay' }} />
        <Stack.Screen name="account" options={{ title: 'My account' }} />
        <Stack.Screen name="new-launches" options={{ title: 'New launches' }} />
        <Stack.Screen name="upcoming/[slug]" options={{ title: 'Upcoming project' }} />
        <Stack.Screen name="land/index" options={{ title: 'Land and warehouses' }} />
        <Stack.Screen name="land/listing/[slug]" options={{ title: 'Land' }} />
        <Stack.Screen name="land/wanted/[slug]" options={{ title: 'Wanted' }} />
        <Stack.Screen name="land/post" options={{ title: 'List your land free' }} />
        <Stack.Screen name="land/want" options={{ title: 'Post what you need' }} />
        <Stack.Screen name="guides/index" options={{ title: 'Home buying guides' }} />
        <Stack.Screen name="guides/[slug]" options={{ title: 'Guide' }} />
        <Stack.Screen name="compare" options={{ title: 'Compare homes' }} />
        <Stack.Screen name="compare-projects" options={{ title: 'Compare projects' }} />
        <Stack.Screen name="compare-localities/[city]/[pair]" options={{ title: 'Compare localities' }} />
      </Stack>
      <CompareBar />
    </SafeAreaProvider>
  );
}

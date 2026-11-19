import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { Ask } from '../components/Ask';
import { useTheme } from '../lib/theme';

export default function Home() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <Link href="/compare" style={{ color: t.brand, fontWeight: '600', fontSize: 16, paddingHorizontal: 8 }}><Text>Compare</Text></Link>
          <Link href="/tools" style={{ color: t.brand, fontWeight: '600', fontSize: 16, paddingHorizontal: 8 }}><Text>Tools</Text></Link>
          <Link href="/account" accessibilityLabel="My account" style={{ color: t.brand, fontWeight: '600', fontSize: 16, paddingHorizontal: 8 }}><Text>♡</Text></Link>
          <Link href="/browse" style={{ color: t.brand, fontWeight: '600', fontSize: 16, paddingHorizontal: 8 }}><Text>Browse</Text></Link>
        </View>
      ) }} />
      <Ask />
    </>
  );
}

import { Link, Stack } from 'expo-router';
import { Text } from 'react-native';
import { Ask } from '../components/Ask';
import { useTheme } from '../lib/theme';

export default function Home() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ headerRight: () => <Link href="/browse" style={{ color: t.brand, fontWeight: '600', fontSize: 16, paddingHorizontal: 8 }}><Text>Browse</Text></Link> }} />
      <Ask />
    </>
  );
}

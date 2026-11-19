import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUpcoming, notifyUpcoming, type UpcomingItem } from '../lib/api';
import { useSession } from '../lib/session';
import { useTheme } from '../lib/theme';

const AMBER = '#b45309';

/** "Tell me when it is registered": the one thing a buyer can do about a project that is not registered yet. */
export function NotifyBox({ slug, name }: { slug: string; name: string }) {
  const t = useTheme();
  const { signedIn, email: mine } = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');
  const ok = signedIn || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const send = () => { setState('busy'); setError(''); notifyUpcoming(slug, signedIn ? undefined : email.trim()).then(() => setState('done')).catch((e: Error) => { setError(e.message); setState('idle'); }); };
  if (state === 'done') return <View style={[s.done, { backgroundColor: t.readyBg }]}><Text style={{ color: t.ready, fontWeight: '600', lineHeight: 20 }}>🔔 We will email you once, when {name} is registered.</Text></View>;
  if (!open) return <Pressable accessibilityRole="button" onPress={() => (signedIn ? send() : setOpen(true))} style={[s.btn, { backgroundColor: AMBER }]}><Text style={{ color: '#fff', fontWeight: '700' }}>🔔 Tell me when it is registered</Text></Pressable>;
  return (
    <View style={{ gap: 8 }}>
      <TextInput value={email} onChangeText={setEmail} placeholder="Your email" placeholderTextColor={t.muted} accessibilityLabel="Your email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoFocus style={[s.input, { borderColor: t.line, color: t.fg, backgroundColor: t.card }]} />
      {error ? <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ok || state === 'busy' }} disabled={!ok || state === 'busy'} onPress={send} style={[s.btn, { backgroundColor: ok ? AMBER : t.line }]}><Text style={{ color: ok ? '#fff' : t.muted, fontWeight: '700' }}>{state === 'busy' ? 'Saving…' : 'Tell me'}</Text></Pressable>
      <Text style={{ color: t.muted, fontSize: 12 }}>One email, when it is registered. The email has a link to stop.</Text>
    </View>
  );
}

/** Upcoming projects on the home screen: a row to swipe, each marked "not yet registered". */
export function Upcoming() {
  const t = useTheme();
  const router = useRouter();
  const [data, setData] = useState<{ notice: string; items: UpcomingItem[] } | null>(null);
  useEffect(() => { getUpcoming().then(setData).catch(() => setData(null)); }, []);
  if (!data?.items.length) return null;
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Upcoming projects</Text>
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}><Text style={{ color: AMBER, fontWeight: '700' }}>Awaiting RERA registration. </Text>Not for sale yet; shown for information only.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
        {data.items.map((u) => (
          <Pressable key={u.slug} accessibilityRole="button" accessibilityLabel={`${u.name}, not yet registered. Open`} onPress={() => router.push({ pathname: '/upcoming/[slug]', params: { slug: u.slug } })} style={({ pressed }) => [s.card, { backgroundColor: t.card, borderColor: pressed ? AMBER : t.line }]}>
            <View style={[s.art, { backgroundColor: AMBER }]}>
              {u.youtubeId ? <Image source={{ uri: `https://i.ytimg.com/vi/${u.youtubeId}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800' }}>{u.name.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase()}</Text>}
              {u.youtubeId ? <View style={s.play}><Text style={{ color: '#fff', fontSize: 18 }}>▶</Text></View> : null}
              <View style={[s.badge, { backgroundColor: AMBER }]}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Not yet registered</Text></View>
            </View>
            <View style={{ padding: 12, gap: 2 }}>
              <Text numberOfLines={1} style={{ color: t.fg, fontSize: 15, fontWeight: '700' }}>{u.name}</Text>
              <Text numberOfLines={1} style={{ color: t.muted, fontSize: 12 }}>{u.builder} · {u.locality.name}</Text>
              <Text numberOfLines={1} style={{ color: t.fg, fontSize: 12, marginTop: 4 }}>{u.expected ? <>Expected <Text style={{ fontWeight: '700' }}>{u.expected}</Text></> : 'Tell me when it is registered →'}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: 220, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  art: { height: 124, alignItems: 'center', justifyContent: 'center' },
  play: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingLeft: 3, backgroundColor: 'rgba(229,72,77,0.95)' },
  badge: { position: 'absolute', top: 8, left: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  btn: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  done: { borderRadius: 12, padding: 12 },
});

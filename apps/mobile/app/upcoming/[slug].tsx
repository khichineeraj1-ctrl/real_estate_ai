import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NotifyBox } from '../../components/Upcoming';
import { getUpcomingOne, type Place, type UpcomingItem } from '../../lib/api';
import { useTheme } from '../../lib/theme';

const AMBER = '#b45309';

/** A project that is coming but not yet on a RERA register: what is planned, the site video, and "tell me when". */
export default function UpcomingScreen() {
  const t = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [u, setU] = useState<(UpcomingItem & { notice: string; registeredAs: Place | null }) | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setU(null); getUpcomingOne(slug).then(setU).catch((e: Error) => setError(e.message)); }, [slug]);
  if (error) return <Text style={{ color: t.danger, padding: 16 }}>{error}</Text>;
  if (!u) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;
  const dark = t.bg !== '#ffffff';
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: u.name }} />
      <View style={[s.flag, { backgroundColor: AMBER }]}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>UPCOMING · NOT YET RERA REGISTERED</Text></View>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 22, fontWeight: '700', lineHeight: 28 }}>{u.name}</Text>
      <Text style={{ color: t.muted }}>{u.builder} · {u.locality.name}, {u.city.name}{u.expected ? ` · expected ${u.expected}` : ''}</Text>

      {u.registeredAs ? (
        <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/project/[slug]', params: { slug: u.registeredAs!.slug } })} style={[s.box, { backgroundColor: t.readyBg, borderColor: t.ready }]}>
          <Text style={{ color: t.ready, fontWeight: '700' }}>Now registered with RERA. See {u.registeredAs.name} →</Text>
        </Pressable>
      ) : (
        <View style={[s.box, { backgroundColor: dark ? '#2b2110' : '#fff4e5', borderColor: dark ? '#6b4a14' : '#f7c98b' }]}>
          <Text style={{ color: t.fg, fontWeight: '700' }}>This project is not for sale yet.</Text>
          <Text style={{ color: t.fg, lineHeight: 20 }}>{u.notice} We show no price, and there is nothing to book. If anyone asks you for money for it, ask for its RERA registration number first.</Text>
        </View>
      )}

      {u.youtubeId ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Play the site video on YouTube" onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${u.youtubeId}`)} style={s.video}>
          <Image source={{ uri: `https://i.ytimg.com/vi/${u.youtubeId}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={s.play}><Text style={{ color: '#fff', fontSize: 22 }}>▶</Text></View>
          <View style={s.by}><Text numberOfLines={1} style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{u.videoTitle ?? 'Site video'}{u.sharedBy ? ` · by ${u.sharedBy.name}, ${u.sharedBy.as}` : ''}</Text></View>
        </Pressable>
      ) : null}

      {u.about ? (
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>What is planned</Text>
          <Text style={{ color: t.fg, lineHeight: 22 }}>{u.about}</Text>
          <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>As told to us{u.sharedBy ? ` by ${u.sharedBy.name}, ${u.sharedBy.as}` : ''}. Plans can change before registration.</Text>
        </View>
      ) : null}

      {!u.registeredAs ? (
        <View style={[s.box, { backgroundColor: t.soft, borderColor: t.line }]}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Want to know when it is registered?</Text>
          <Text style={{ color: t.muted, lineHeight: 20 }}>We will email you once, when its registration appears on the RERA register.{u.waiting ? ` ${u.waiting} buyer${u.waiting === 1 ? ' is' : 's are'} waiting to hear.` : ''}</Text>
          <NotifyBox slug={u.slug} name={u.name} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  video: { height: 190, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  play: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', paddingLeft: 4, backgroundColor: 'rgba(229,72,77,0.95)' },
  by: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.55)' },
});

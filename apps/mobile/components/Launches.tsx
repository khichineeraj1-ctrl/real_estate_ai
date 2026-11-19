import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_URL } from '../lib/config';
import { photoUrl } from '../lib/api';
import { monthYear } from '../lib/format';
import { useTheme } from '../lib/theme';

interface Launch {
  slug: string; name: string; builder: string; brand: { name: string } | null; registerValidUntil: string | null; registeredOn: string;
  photos?: { file: string }[]; locality: { name: string }; city: { name: string }; video: { youtubeId: string; title: string | null; by: string | null } | null;
}
function ago(iso: string): string {
  const then = new Date(iso); const now = new Date();
  const m = (now.getUTCFullYear() - then.getUTCFullYear()) * 12 + now.getUTCMonth() - then.getUTCMonth();
  return m <= 0 ? 'this month' : m === 1 ? 'last month' : `${m} months ago`;
}

/** Newly launched projects, as a row to swipe through. A card with a site video opens it on YouTube. */
export function Launches() {
  const t = useTheme();
  const router = useRouter();
  const [data, setData] = useState<{ total: number; months: number; items: Launch[] } | null>(null);
  useEffect(() => { fetch(`${API_URL}/launches`).then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null)); }, []);
  if (!data?.items.length) return null; // nothing new, or offline: the row simply is not there
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>New launches</Text>
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>Registered with RERA in the last {data.months} months and still being built.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
        {data.items.map((p) => {
          const open = () => router.push({ pathname: '/project/[slug]', params: { slug: p.slug } });
          return (
            <View key={p.slug} style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={p.video ? `Play the site video of ${p.name}` : `Open ${p.name}`} onPress={p.video ? () => Linking.openURL(`https://www.youtube.com/watch?v=${p.video!.youtubeId}`) : open} style={[s.art, { backgroundColor: t.brand }]}>
                {p.video ? <Image source={{ uri: `https://i.ytimg.com/vi/${p.video.youtubeId}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : p.photos?.[0] ? <Image source={{ uri: photoUrl(p.photos[0].file, 'card') }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    : <Text style={{ color: t.brandInk, fontSize: 40, fontWeight: '800' }}>{p.name.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase()}</Text>}
                {p.video ? <View style={s.play}><Text style={{ color: '#fff', fontSize: 18 }}>▶</Text></View> : null}
                <View style={[s.badge, { backgroundColor: t.ready }]}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>New · {ago(p.registeredOn)}</Text></View>
                {p.video ? <View style={s.by}><Text numberOfLines={1} style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>▶ Site video{p.video.by ? ` by ${p.video.by}` : ''}</Text></View> : null}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Open ${p.name}`} onPress={open} style={{ padding: 12, gap: 2 }}>
                <Text numberOfLines={1} style={{ color: t.fg, fontSize: 15, fontWeight: '700' }}>{p.name}</Text>
                <Text numberOfLines={1} style={{ color: t.muted, fontSize: 12 }}>{p.brand?.name ?? p.builder} · {p.locality.name}</Text>
                <Text style={{ color: t.fg, fontSize: 12, marginTop: 4 }}>Due <Text style={{ fontWeight: '700' }}>{monthYear(p.registerValidUntil) ?? '—'}</Text></Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: 220, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  art: { height: 124, alignItems: 'center', justifyContent: 'center' },
  play: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingLeft: 3, backgroundColor: 'rgba(229,72,77,0.95)' },
  badge: { position: 'absolute', top: 8, left: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  by: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.55)' },
});

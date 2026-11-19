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
/** `all` is the full list down the screen; without it, the home screen's row with a way through to the full list. */
export function Launches({ all = false }: { all?: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const [data, setData] = useState<{ total: number; months: number; items: Launch[] } | null>(null);
  useEffect(() => { fetch(`${API_URL}/launches${all ? '?all=1' : ''}`).then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null)); }, [all]);
  // Nothing new, or offline: the home row simply is not there; the full screen says so.
  if (!data?.items.length) return all && data ? <Text style={{ color: t.muted, padding: 16 }}>No projects have been registered in the last {data.months} months, as far as the registers we read show.</Text> : null;
  const card = (p: Launch, wide: boolean) => {
          const open = () => router.push({ pathname: '/project/[slug]', params: { slug: p.slug } });
          return (
            <View key={p.slug} style={[s.card, wide && { width: '100%' }, { backgroundColor: t.card, borderColor: t.line }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={p.video ? `Play the site video of ${p.name}` : `Open ${p.name}`} onPress={p.video ? () => Linking.openURL(`https://www.youtube.com/watch?v=${p.video!.youtubeId}`) : open} style={[s.art, wide && { height: 170 }, { backgroundColor: t.brand }]}>
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
  };
  if (all) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }}>{data.total} projects registered with RERA in the last {data.months} months and still being built.</Text>
        {data.items.map((p) => card(p, true))}
        <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>A project counts as new by the date on its RERA registration. Today only Haryana’s register prints that date, so this list covers Gurgaon.</Text>
      </ScrollView>
    );
  }
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>New launches</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/new-launches')}><Text style={{ color: t.brand, fontWeight: '700' }}>View all {data.total} →</Text></Pressable>
      </View>
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>Registered with RERA in the last {data.months} months and still being built.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
        {data.items.map((p) => card(p, false))}
        {data.total > data.items.length ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/new-launches')} style={[s.card, s.more, { borderColor: t.brand, backgroundColor: t.soft }]}>
            <Text style={{ color: t.brand, fontSize: 34, fontWeight: '800' }}>+{data.total - data.items.length}</Text>
            <Text style={{ color: t.muted }}>more new launches</Text>
            <Text style={{ color: t.brand, fontWeight: '700', marginTop: 6 }}>View all →</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  more: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', minHeight: 200 },
  card: { width: 220, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  art: { height: 124, alignItems: 'center', justifyContent: 'center' },
  play: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingLeft: 3, backgroundColor: 'rgba(229,72,77,0.95)' },
  badge: { position: 'absolute', top: 8, left: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  by: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.55)' },
});

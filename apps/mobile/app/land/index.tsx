import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { KIND_PLURAL, KindTile, LandCard, WantedCard, s } from '../../components/Land';
import { closeLand, getLand, getLandPlaces, getWanted, landMine, type LandItem, type LandMine, type WantedItem } from '../../lib/api';
import { forgetPost, myPostTokens } from '../../lib/landposts';
import { useTheme } from '../../lib/theme';

const STATUS: Record<string, string> = { PENDING: 'Waiting for our team to check it', LIVE: 'Live', REJECTED: 'Not accepted', CLOSED: 'Closed' };

/** Land and commercial space: choose a kind, see what is listed, what companies want, and what you have posted. */
export default function Land() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState(params.kind ?? '');
  const [deal, setDeal] = useState('');
  const [kinds, setKinds] = useState<{ kind: string; label: string; count: number }[]>([]);
  const [items, setItems] = useState<LandItem[] | null>(null);
  const [wanted, setWanted] = useState<WantedItem[]>([]);
  const [mine, setMine] = useState<(LandMine & { token: string })[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { getLandPlaces().then((p) => setKinds(p.kinds)).catch(() => undefined); getWanted().then((w) => setWanted(w.items)).catch(() => undefined); }, []);
  useEffect(() => { setItems(null); setError(''); getLand({ kind, deal }).then((r) => setItems(r.items)).catch((e: Error) => setError(e.message)); }, [kind, deal]);
  const loadMine = useCallback(() => {
    void myPostTokens().then(async (tokens) => {
      const rows = await Promise.all(tokens.map((token) => landMine(token).then((m) => ({ ...m, token })).catch(() => null)));
      setMine(rows.filter((r): r is LandMine & { token: string } => !!r));
    });
  }, []);
  useFocusEffect(loadMine); // coming back from the form shows the new post
  const close = (m: LandMine & { token: string }) => {
    const go = () => { void closeLand(m.token).then(loadMine).catch((e: Error) => setError(e.message)); };
    const q = m.type === 'listing' ? 'Mark this as sold or let? It will stop showing.' : 'Close this requirement? It will stop showing.';
    if (Platform.OS === 'web') { if (globalThis.confirm?.(q)) go(); } else Alert.alert('Take it down?', q, [{ text: 'Cancel', style: 'cancel' }, { text: 'Take it down', style: 'destructive', onPress: go }]);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 24, fontWeight: '800', lineHeight: 30 }}>Land and space, anywhere in India</Text>
      <Text style={{ color: t.muted, lineHeight: 21 }}>Farm land, plots, industrial land and ready warehouses, from villages to city edges.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{kinds.map((k) => <KindTile key={k.kind} k={k} on={kind === k.kind} onPress={() => setKind(kind === k.kind ? '' : k.kind)} />)}</View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/land/post')} style={[s.btn, { backgroundColor: t.brand, flex: 1 }]}><Text style={{ color: t.brandInk, fontWeight: '700' }}>{'🌾\u2002List yours free'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/land/want')} style={[s.btn, { backgroundColor: t.soft, borderWidth: 1, borderColor: t.line, flex: 1 }]}><Text style={{ color: t.fg, fontWeight: '700' }}>{'🔎\u2002Post a need'}</Text></Pressable>
      </View>

      {mine.length > 0 && (
        <View style={[s.panel, { backgroundColor: t.soft, borderColor: t.line }]}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 16, fontWeight: '700' }}>Posted from this phone</Text>
          {mine.map((m) => (
            <View key={m.token} style={{ gap: 2, borderTopWidth: 1, borderColor: t.line, paddingTop: 8 }}>
              <Text style={{ color: t.fg, fontWeight: '600' }}>{m.title.charAt(0).toUpperCase() + m.title.slice(1)}</Text>
              <Text style={{ color: m.status === 'LIVE' ? t.ready : t.muted, fontSize: 13 }}>{STATUS[m.status] ?? m.status}{m.note ? `: ${m.note}` : ''} · {m.replies} {m.type === 'listing' ? 'enquir' + (m.replies === 1 ? 'y' : 'ies') : 'answer' + (m.replies === 1 ? '' : 's')}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                {m.status === 'LIVE' ? <Pressable accessibilityRole="link" hitSlop={8} onPress={() => (m.type === 'listing' ? router.push({ pathname: '/land/listing/[slug]', params: { slug: m.slug } }) : router.push({ pathname: '/land/wanted/[slug]', params: { slug: m.slug } }))}><Text style={{ color: t.brand, fontWeight: '600' }}>View</Text></Pressable> : null}
                {m.status === 'LIVE' || m.status === 'PENDING' ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => close(m)}><Text style={{ color: t.danger, fontWeight: '600' }}>{m.type === 'listing' ? 'Sold or let: take down' : 'Found it: close'}</Text></Pressable>
                  : <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { void forgetPost(m.token).then(loadMine); }}><Text style={{ color: t.muted, fontWeight: '600' }}>Remove from this list</Text></Pressable>}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', flex: 1 }}>{kind ? KIND_PLURAL[kind] ?? 'Listings' : 'Latest listings'}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[['', 'All'], ['SALE', 'Sale'], ['LEASE', 'Rent']].map(([d, label]) => (
            <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: deal === d }} onPress={() => setDeal(d)} style={{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderColor: deal === d ? t.brand : t.line, backgroundColor: deal === d ? t.brand : 'transparent' }}>
              <Text style={{ color: deal === d ? t.brandInk : t.fg, fontSize: 13, fontWeight: '600' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {error ? <Text style={{ color: t.danger }}>{error}</Text> : !items ? <ActivityIndicator color={t.brand} /> : items.length === 0
        ? <View style={[s.panel, { borderColor: t.line, borderStyle: 'dashed', backgroundColor: t.soft }]}><Text style={{ color: t.muted, lineHeight: 20 }}>Nothing listed here yet. List yours free, or post what you are looking for and let owners come to you.</Text></View>
        : items.map((l) => <LandCard key={l.slug} l={l} />)}

      <Pressable accessibilityRole="link" hitSlop={6} onPress={() => router.push('/tools/land-area')}><Text style={{ color: t.brand, fontWeight: '700' }}>📏 Convert acres, hectares, gaj, guntha, kanal →</Text></Pressable>

      {wanted.length > 0 && (
        <>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 10 }}>Wanted: companies looking now</Text>
          <Text style={{ color: t.muted, fontSize: 13, marginTop: -8 }}>Have land or a building that fits? Answer, and our team connects you.</Text>
          {wanted.map((w) => <WantedCard key={w.slug} w={w} />)}
        </>
      )}
    </ScrollView>
  );
}

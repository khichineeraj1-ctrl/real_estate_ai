import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { getLandPlaces, photoUrl, replyLand, type LandItem, type Place, type WantedItem } from '../lib/api';
import { price } from '../lib/format';
import { useTheme } from '../lib/theme';

export const KIND_ICON: Record<string, string> = { FARM: '🌾', PLOT: '📐', INDUSTRIAL: '🏭', BUILT: '🏬' };
export const KIND_PLURAL: Record<string, string> = { FARM: 'Farm land', PLOT: 'Plots', INDUSTRIAL: 'Industrial land', BUILT: 'Warehouses and shops' };
export const PURPOSE_ICON: Record<string, string> = { WAREHOUSE: '📦', DARK_STORE: '🛒', FACTORY: '🏭', RETAIL: '🏪', FARMING: '🌾', HOUSING: '🏠', OTHER: '📍' };
const TINT: Record<string, { light: [string, string]; dark: [string, string] }> = {
  FARM: { light: ['#15803d', '#e7f6ec'], dark: ['#6ee7a0', '#12281b'] }, PLOT: { light: ['#b45309', '#fdf1dc'], dark: ['#fbbf6b', '#2c2110'] },
  INDUSTRIAL: { light: ['#4338ca', '#eceafd'], dark: ['#a5a0ff', '#1c1a3a'] }, BUILT: { light: ['#0e7490', '#e0f4f8'], dark: ['#67d6ea', '#0f2a31'] },
};
/** Each kind of land has its own colour: [ink, background]. */
export function useTint(kind: string): [string, string] { const d = useColorScheme() === 'dark'; return (TINT[kind] ?? TINT.FARM)[d ? 'dark' : 'light']; }
export const landPrice = (l: { priceInr: number | null; deal: string }) => (l.priceInr ? `${price(l.priceInr)}${l.deal === 'LEASE' ? ' a month' : ''}` : 'Price on request');
export const roadText = (l: { roadFt: number | null; highway: string | null; highwayKm: number | null }) =>
  [l.roadFt ? `${l.roadFt} ft road` : null, l.highway ? `${l.highwayKm != null ? `${l.highwayKm} km from ` : 'near '}${l.highway}` : null].filter(Boolean).join(' · ');
export const ago = (iso: string) => { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000); return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };

export function Tag({ text, tone }: { text: string; tone?: 'rent' | 'closed' }) {
  const t = useTheme();
  return <View style={[s.tag, { backgroundColor: tone === 'rent' ? t.readyBg : t.soft, borderColor: tone === 'closed' ? t.danger : tone === 'rent' ? 'transparent' : t.line }]}><Text style={{ fontSize: 11, fontWeight: '700', color: tone === 'rent' ? t.ready : tone === 'closed' ? t.danger : t.fg }}>{text}</Text></View>;
}

export function LandCard({ l }: { l: LandItem }) {
  const t = useTheme();
  const router = useRouter();
  const [ink, bg] = useTint(l.kind);
  const road = roadText(l);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${l.title}. ${landPrice(l)}. Open`} onPress={() => router.push({ pathname: '/land/listing/[slug]', params: { slug: l.slug } })} style={({ pressed }) => [s.card, { backgroundColor: t.card, borderColor: pressed ? ink : t.line }]}>
      {l.photos[0] ? (
        <View style={{ height: 170, backgroundColor: t.soft }}>
          <Image source={{ uri: photoUrl(l.photos[0].file, 'card') }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
          {l.photos.length > 1 ? <View style={s.count}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>▣ {l.photos.length}</Text></View> : null}
        </View>
      ) : null}
      <View style={[s.art, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 30 }}>{KIND_ICON[l.kind]}</Text>
        <View style={{ flex: 1 }}><Text style={{ color: ink, fontSize: 19, fontWeight: '800' }}>{l.area}</Text>{l.areaAlso ? <Text style={{ color: t.muted, fontSize: 12 }}>about {l.areaAlso}</Text> : null}</View>
      </View>
      <View style={{ padding: 14, gap: 4 }}>
        <View style={s.tags}><Tag text={l.kindLabel} /><Tag text={l.deal === 'LEASE' ? 'For rent' : 'For sale'} tone={l.deal === 'LEASE' ? 'rent' : undefined} /></View>
        <Text style={{ color: t.fg, fontSize: 16, fontWeight: '700' }}>{l.place}, {l.district}</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>{l.state}</Text>
        <Text style={{ color: t.fg, fontSize: 17, fontWeight: '700', marginTop: 4 }}>{landPrice(l)}{l.rate ? <Text style={{ color: t.muted, fontSize: 13, fontWeight: '400' }}>   {l.rate}</Text> : null}</Text>
        {road ? <Text style={{ color: t.muted, fontSize: 13 }}>🛣 {road}</Text> : null}
        <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{l.posterIs === 'DEALER' ? 'Dealer' : l.posterIs === 'COMPANY' ? 'Company' : 'Owner'} · {ago(l.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export function WantedCard({ w }: { w: WantedItem }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Wanted: ${w.title}. Open`} onPress={() => router.push({ pathname: '/land/wanted/[slug]', params: { slug: w.slug } })} style={({ pressed }) => [s.want, { backgroundColor: t.card, borderColor: t.brand, borderStyle: pressed ? 'solid' : 'dashed' }]}>
      <Text style={{ fontSize: 26 }}>{PURPOSE_ICON[w.purpose] ?? '📍'}</Text>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={s.tags}><Tag text="Wanted" /><Tag text={w.purposeLabel} /><Tag text={w.deal === 'LEASE' ? 'On rent' : 'To buy'} tone={w.deal === 'LEASE' ? 'rent' : undefined} /></View>
        <Text style={{ color: t.fg, fontSize: 15, fontWeight: '700' }}>{w.size} of {w.kindLabel.toLowerCase()}</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>{w.where ? `${w.where}, ` : ''}{w.state}</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>{w.by ?? 'A company'}{w.budgetInr ? ` · up to ${price(w.budgetInr)}${w.deal === 'LEASE' ? ' a month' : ''}` : ''} · {ago(w.createdAt)}</Text>
        <Text style={{ color: t.brand, fontWeight: '700', fontSize: 13, marginTop: 2 }}>I have this →</Text>
      </View>
    </Pressable>
  );
}

/** Pills to choose one of a few. */
export function Choice({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: { code: string; label: string; icon?: string }[] }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={{ color: t.fg, fontWeight: '700' }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => { const on = o.code === value; return (
          <Pressable key={o.code} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => set(o.code)} style={[s.pill, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.card }]}>
            <Text style={{ color: on ? t.brandInk : t.fg, fontWeight: '600' }}>{o.icon ? `${o.icon}\u2002` : ''}{o.label}</Text>
          </Pressable>); })}
      </View>
    </View>
  );
}
export function Field({ label, hint, ...rest }: { label: string; hint?: string } & React.ComponentProps<typeof TextInput>) {
  const t = useTheme();
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={t.muted} {...rest} style={[s.input, { borderColor: t.line, color: t.fg, backgroundColor: t.bg }, rest.multiline ? { minHeight: 84, textAlignVertical: 'top' } : null]} />
      {hint ? <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{hint}</Text> : null}
    </View>
  );
}
/** A field that opens a list to choose from: used for the state and the unit, which have too many choices for pills. */
export function Picker({ label, value, set, options, placeholder }: { label: string; value: string; set: (v: string) => void; options: { code: string; label: string }[]; placeholder?: string }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.code === value);
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${chosen?.label ?? 'not chosen'}. Change`} onPress={() => setOpen(true)} style={[s.input, { borderColor: t.line, backgroundColor: t.bg, flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Text style={{ color: chosen ? t.fg : t.muted, fontSize: 16 }}>{chosen?.label ?? placeholder ?? 'Choose'}</Text><Text style={{ color: t.muted }}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={[s.sheet, { backgroundColor: t.bg }]}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700', padding: 16 }}>{label}</Text>
          <ScrollView>
            {options.map((o) => (
              <Pressable key={o.code} accessibilityRole="button" onPress={() => { set(o.code); setOpen(false); }} style={{ paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.line, backgroundColor: o.code === value ? t.soft : 'transparent' }}>
                <Text style={{ color: o.code === value ? t.brand : t.fg, fontSize: 16, fontWeight: o.code === value ? '700' : '400' }}>{o.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
export const states = (list: Place[]) => list.map((x) => ({ code: x.slug, label: x.name }));
export function Tick({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={() => set(!on)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={[s.box, { borderColor: on ? t.brand : t.muted, backgroundColor: on ? t.brand : 'transparent' }]}>{on ? <Text style={{ color: t.brandInk, fontSize: 13, fontWeight: '800' }}>✓</Text> : null}</View>
      <Text style={{ color: t.fg, flex: 1, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}
export const phoneOk = (p: string) => /^\+?\d{10,13}$/.test(p.replace(/[\s()-]/g, ''));

/** A buyer asks about a listing, or an owner answers a requirement: a button that opens three fields. */
export function ReplyBox({ type, slug, label, sent }: { type: 'listing' | 'wanted'; slug: string; label: string; sent: string }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle'); const [error, setError] = useState('');
  const ok = name.trim().length > 1 && phoneOk(phone) && (type === 'listing' || message.trim().length > 3);
  const send = () => { setState('busy'); setError(''); replyLand(type, slug, { name: name.trim(), phone: phone.trim(), message: message.trim() || undefined }).then(() => setState('done')).catch((e: Error) => { setError(e.message); setState('idle'); }); };
  if (state === 'done') return <View style={{ backgroundColor: t.readyBg, borderRadius: 12, padding: 12 }}><Text style={{ color: t.ready, fontWeight: '600', lineHeight: 20 }}>✓ Sent. {sent}</Text></View>;
  if (!open) return <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={[s.btn, { backgroundColor: t.brand }]}><Text style={{ color: t.brandInk, fontWeight: '700', fontSize: 16 }}>{label}</Text></Pressable>;
  return (
    <View style={{ gap: 10 }}>
      <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" autoFocus maxLength={80} />
      <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={20} />
      <Field label={type === 'wanted' ? 'What you have: where, how big, what price' : 'Message (optional)'} value={message} onChangeText={setMessage} multiline maxLength={600} />
      {error ? <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ok || state === 'busy' }} disabled={!ok || state === 'busy'} onPress={send} style={[s.btn, { backgroundColor: ok ? t.brand : t.line }]}><Text style={{ color: ok ? t.brandInk : t.muted, fontWeight: '700', fontSize: 16 }}>{state === 'busy' ? 'Sending…' : 'Send'}</Text></Pressable>
      <Text style={{ color: t.muted, fontSize: 12 }}>By sending, you agree that our team may call you about this.</Text>
    </View>
  );
}

/** The home screen's feature on land: what it is, the four kinds, and a door each for owners and for companies. */
export function LandRow() {
  const t = useTheme();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const [data, setData] = useState<{ kinds: { kind: string; label: string; count: number }[]; wanted: number } | null>(null);
  useEffect(() => { getLandPlaces().then(setData).catch(() => setData(null)); }, []);
  if (!data) return null;
  const door = (icon: string, title: string, text: string, cta: string, href: '/land/post' | '/land/want') => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${cta}`} onPress={() => router.push(href)} style={({ pressed }) => [s.door, { backgroundColor: t.card, borderColor: pressed ? t.brand : t.line }]}>
      <Text style={{ fontSize: 28 }}>{icon}</Text>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: t.fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
        <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>{text}</Text>
        <View style={{ alignSelf: 'flex-start', backgroundColor: t.brand, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginTop: 5 }}><Text style={{ color: t.brandInk, fontWeight: '700', fontSize: 13 }}>{cta} →</Text></View>
      </View>
    </Pressable>
  );
  return (
    <View style={[s.band, { backgroundColor: dark ? '#13241a' : '#eaf5ee', borderColor: t.line }]}>
      <View style={s.newTag}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>NEW · ALL INDIA</Text></View>
      <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 20, fontWeight: '800', lineHeight: 26 }}>Land, plots and warehouses, far beyond the big cities</Text>
      <Text style={{ color: t.muted, fontSize: 14, lineHeight: 20 }}>Selling a field in your village, or hunting for land for a warehouse or a dark store? Both sides meet here, free.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>{data.kinds.map((k) => <KindTile key={k.kind} k={k} plain onPress={() => router.push({ pathname: '/land', params: { kind: k.kind } })} />)}</View>
      {door('🌾', 'I have land or space', 'Owners, farmers, dealers. One form, no account. Your number stays private.', 'List it free', '/land/post')}
      {door('🏭', 'My company needs land or space', 'Warehouse, factory, dark store, shop. Say the size and the area; owners come to you.', 'Post a requirement', '/land/want')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, marginTop: 2 }}>
        <Pressable accessibilityRole="link" hitSlop={6} onPress={() => router.push('/land')}><Text style={{ color: t.brand, fontWeight: '700' }}>Browse all land →</Text></Pressable>
        <Pressable accessibilityRole="link" hitSlop={6} onPress={() => router.push('/tools/land-area')}><Text style={{ color: t.brand, fontWeight: '700' }}>Convert acres, gaj →</Text></Pressable>
      </View>
      {data.wanted ? <Text style={{ color: t.muted, fontSize: 13 }}>{data.wanted} compan{data.wanted === 1 ? 'y is' : 'ies are'} looking for land now.</Text> : null}
    </View>
  );
}
/** A short pointer to land, for screens about homes. */
export function LandStrip({ text = 'Selling land, or need space for a business?' }: { text?: string }) {
  const t = useTheme();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${text} Open land and warehouses`} onPress={() => router.push('/land')} style={({ pressed }) => [s.door, { backgroundColor: dark ? '#13241a' : '#eaf5ee', borderColor: pressed ? t.brand : t.line }]}>
      <Text style={{ fontSize: 28 }}>🌾</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: t.fg, fontWeight: '700', fontSize: 15 }}>{text}</Text>
        <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>Farm land, plots, industrial land and warehouses across India, listed by owners.</Text>
        <Text style={{ color: t.brand, fontWeight: '700', marginTop: 4 }}>Land and warehouses →</Text>
      </View>
    </Pressable>
  );
}
export function KindTile({ k, on, plain, onPress }: { k: { kind: string; count: number }; on?: boolean; plain?: boolean; onPress: () => void }) {
  const t = useTheme();
  const [ink, bg] = useTint(k.kind);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} accessibilityLabel={`${KIND_PLURAL[k.kind]}, ${k.count} listed`} onPress={onPress} style={[s.tile, { backgroundColor: plain ? t.card : bg, borderColor: on ? ink : 'transparent' }]}>
      <Text style={{ fontSize: 26 }}>{KIND_ICON[k.kind]}</Text>
      <Text style={{ color: t.fg, fontWeight: '700', fontSize: 14 }}>{KIND_PLURAL[k.kind]}</Text>
      <Text style={{ color: ink, fontWeight: '700', fontSize: 12 }}>{k.count ? `${k.count} listed` : 'List yours'}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  art: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  want: { flexDirection: 'row', gap: 12, borderWidth: 1.5, borderRadius: 18, padding: 14 },
  pill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  btn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, borderWidth: 2, padding: 14, gap: 2 },
  band: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 10, marginTop: 10 },
  newTag: { alignSelf: 'flex-start', backgroundColor: '#15803d', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  door: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  scrim: { flex: 1, backgroundColor: 'rgba(10,12,16,0.5)' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  fact: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  count: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(10,12,16,0.7)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  thumb: { width: 84, height: 84, borderRadius: 12, overflow: 'hidden' },
  x: { position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(10,12,16,0.72)', alignItems: 'center', justifyContent: 'center' },
});

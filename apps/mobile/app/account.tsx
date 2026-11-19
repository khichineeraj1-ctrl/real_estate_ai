import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SignIn, forgetAccount, refreshAccount, useAccount } from '../components/Account';
import { Cover } from '../components/Cover';
import { saveItem, signOutAccount, unsaveItem, type SavedItem } from '../lib/api';
import { monthYear, price } from '../lib/format';
import { endSession, useSession } from '../lib/session';
import { useTheme, type Theme } from '../lib/theme';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const standing = (x: SavedItem) => (/lapsed/i.test(x.registerStatus ?? '') ? 'RERA registration marked lapsed' : x.registerValidUntil ? `RERA registration ${new Date(x.registerValidUntil) < new Date() ? 'ran' : 'runs'} to ${monthYear(x.registerValidUntil)}` : null);

function Saved({ x, t }: { x: SavedItem; t: Theme }) {
  const router = useRouter();
  const [note, setNote] = useState(x.note ?? '');
  const [kept, setKept] = useState(false);
  const open = () => router.push(x.kind === 'project' ? { pathname: '/project/[slug]', params: { slug: x.slug } } : { pathname: '/property/[slug]', params: { slug: x.slug } });
  const keep = () => { if (note !== (x.note ?? '')) void saveItem(x.kind, x.slug, note).then(() => setKept(true)).catch(() => undefined); };
  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${x.name}`} onPress={open} style={{ gap: 2 }}>
        {x.photo ? <Cover photo={x.photo} label={`${x.name}: photo`} /> : null}
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>{x.kind === 'project' ? 'PROJECT' : 'HOME'}</Text>
        <Text style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>{x.name}</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>{x.sub}{x.priceInr ? ` · ${price(x.priceInr)}` : ''}</Text>
        {x.kind === 'project' && standing(x) ? <Text style={{ color: t.fg, fontSize: 13 }}>{standing(x)}</Text> : null}
      </Pressable>
      <TextInput value={note} onChangeText={(v) => { setNote(v); setKept(false); }} onBlur={keep} multiline maxLength={500} placeholder="Your note: what you liked, what to ask" placeholderTextColor={t.muted} accessibilityLabel={`Your note on ${x.name}`} style={[s.note, { borderColor: t.line, backgroundColor: t.soft, color: t.fg }]} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: t.ready, fontSize: 13 }}>{kept ? 'Note kept ✓' : ''}</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { void unsaveItem(x.kind, x.slug).then(refreshAccount).catch(() => undefined); }}><Text style={{ color: t.muted }}>Remove</Text></Pressable>
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const t = useTheme();
  const router = useRouter();
  const { ready, signedIn, email } = useSession();
  const acc = useAccount();
  useEffect(() => { if (signedIn) void refreshAccount(); }, [signedIn]);
  if (!ready) return <ActivityIndicator style={{ marginTop: 40 }} color={t.brand} />;

  if (!signedIn) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 22, fontWeight: '700' }}>Your account</Text>
        <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }}>Keep your home search in one place, on any device.</Text>
        {[['♥', 'Save projects and homes', 'with your own notes on each'], ['📨', 'See every enquiry you sent', 'and who was to call you']].map(([icon, title, sub]) => (
          <View key={title} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[s.icon, { backgroundColor: t.soft }]}><Text style={{ fontSize: 18, color: t.brand }}>{icon}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ color: t.fg, fontWeight: '700' }}>{title}</Text><Text style={{ color: t.muted }}>{sub}</Text></View>
          </View>
        ))}
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 17, fontWeight: '700' }}>Sign in or start an account</Text>
          <SignIn />
        </View>
      </ScrollView>
    );
  }

  const out = async () => { await signOutAccount().catch(() => undefined); await endSession(); forgetAccount(); };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: t.fg, fontSize: 22, fontWeight: '700' }}>My account</Text><Text numberOfLines={1} style={{ color: t.muted }}>{email}</Text></View>
        <Pressable accessibilityRole="button" onPress={out} style={[s.out, { borderColor: t.line }]}><Text style={{ color: t.fg, fontWeight: '600' }}>Sign out</Text></Pressable>
      </View>
      {!acc ? <ActivityIndicator color={t.brand} /> : (
        <>
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>Saved · {acc.saved.length}</Text>
          {acc.saved.length ? acc.saved.map((x) => <Saved key={`${x.kind}-${x.slug}`} x={x} t={t} />) : (
            <View style={[s.card, { backgroundColor: t.soft, borderColor: t.line, borderStyle: 'dashed' }]}>
              <Text style={{ color: t.muted, lineHeight: 20 }}>Nothing saved yet. Tap “♡ Save” on any project or home and it will appear here.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/browse')}><Text style={{ color: t.brand, fontWeight: '600' }}>Browse by city →</Text></Pressable>
            </View>
          )}
          <Text accessibilityRole="header" style={{ color: t.fg, fontSize: 18, fontWeight: '700', marginTop: 6 }}>Enquiries you sent · {acc.enquiries.length}</Text>
          {acc.enquiries.length ? acc.enquiries.map((e, i) => (
            <View key={i} style={[s.sent, { borderColor: t.line }]}>
              <Text style={{ color: t.muted, fontSize: 12 }}>{when(e.at)}</Text>
              <Text style={{ color: t.fg, fontWeight: '700' }}>{e.about?.name ?? 'A page that is no longer listed'}</Text>
              {e.agent ? (
                <Text style={{ color: t.muted, lineHeight: 20 }}>Passed to {e.agent.name}, an agent we have verified.{e.agent.phone ? <Text style={{ color: t.brand, fontWeight: '600' }} onPress={() => Linking.openURL(`tel:${e.agent!.phone}`)}> Call {e.agent.phone}</Text> : null}</Text>
              ) : <Text style={{ color: t.muted, lineHeight: 20 }}>{e.about?.kind === 'property' ? 'Sent to the seller.' : 'Our team, or the builder’s, was to call you.'}{e.wantsVisit ? ' You asked for a site visit.' : ''}</Text>}
            </View>
          )) : <Text style={{ color: t.muted, lineHeight: 20 }}>You have not sent an enquiry while signed in. When you do, it is kept here.</Text>}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  note: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minHeight: 52, fontSize: 14, textAlignVertical: 'top' },
  out: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  sent: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 2 },
});

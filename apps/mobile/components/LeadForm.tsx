import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Toggle } from './Toggle';
import { TIMELINES, sendEnquiry, sendProjectEnquiry, type LeadResult } from '../lib/api';
import { useTheme, type Theme } from '../lib/theme';

/**
 * 'agent': the project has agents we have verified, and the buyer is connected to one of them.
 * 'seller': a home posted by an owner or agent, whose contact is shown. 'callback': our team or the builder calls back.
 */
export type LeadMode = 'agent' | 'seller' | 'callback';
interface Props { kind: 'project' | 'property'; slug: string; name: string; mode: LeadMode; unclaimed?: boolean; interests?: string[] }

const TITLE: Record<LeadMode, string> = { agent: 'Connect with a verified agent', seller: 'Contact the seller', callback: 'Request a call back' };
const ICON: Record<LeadMode, string> = { agent: '🛡️', seller: '🤝', callback: '📞' };
const WHEN_ICON: Record<string, string> = { NOW: '🔥', SOON: '📅', LATER: '🗓️', EXPLORING: '👀' };

const nameProblem = (v: string) => (v.trim().replace(/[^\p{L}]/gu, '').length >= 2 ? null : 'Enter your name');
const digits = (v: string) => v.replace(/[\s()+-]/g, '');
const phoneProblem = (v: string) => (/^\d{10,13}$/.test(digits(v)) ? null : `${digits(v).length} of 10 digits`);

/** A text box that answers back: a running note under it, a red edge while it is wrong, a green tick once it is right. */
function LiveField({ t, label, value, onChange, check, phone, hint }: { t: Theme; label: string; value: string; onChange: (v: string) => void; check: (v: string) => string | null; phone?: boolean; hint?: string }) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const problem = check(value);
  const ok = !!value && !problem;
  const bad = touched && !!value && !!problem;
  return (
    <View style={{ gap: 4 }}>
      <View style={[s.field, { backgroundColor: focused ? t.card : t.soft, borderColor: bad ? t.danger : ok ? t.ready : focused ? t.brand : t.line }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: focused ? t.brand : t.muted, fontSize: 12 }}>{label}</Text>
          <TextInput
            value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setTouched(true); }}
            accessibilityLabel={label} keyboardType={phone ? 'phone-pad' : 'default'} autoComplete={phone ? 'tel' : 'name'} maxLength={phone ? 20 : 80}
            style={[s.input, { color: t.fg }]}
          />
        </View>
        {ok ? <View style={[s.tick, { backgroundColor: t.ready }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>✓</Text></View> : null}
      </View>
      <Text accessibilityLiveRegion="polite" style={{ color: value && problem ? (bad ? t.danger : t.muted) : ok && phone ? t.ready : t.muted, fontSize: 12, minHeight: 16, marginLeft: 4 }}>
        {value && problem ? problem : ok && phone ? 'Looks right' : hint ?? ''}
      </Text>
    </View>
  );
}

/** The tick that pops in above the thank-you. */
function Burst({ t }: { t: Theme }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start(); }, [scale]);
  return <Animated.View style={[s.burst, { backgroundColor: t.ready, transform: [{ scale }] }]}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>✓</Text></Animated.View>;
}

/** The enquiry form used across the app: on a home's or project's own screen, and in the sheet that opens from a card. */
export function LeadForm({ kind, slug, name: about, mode, unclaimed, interests = [] }: Props) {
  const t = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [timeline, setTimeline] = useState('');
  const [visit, setVisit] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<LeadResult | null>(null);
  const need = [nameProblem(name) ? 'your name' : '', phoneProblem(phone) ? 'your phone number' : '', consent ? '' : 'the switch to agree'].filter(Boolean);
  const ready = need.length === 0;
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(bar, { toValue: (3 - need.length) / 3, duration: 300, useNativeDriver: false }).start(); }, [bar, need.length]);

  async function submit() {
    if (!ready) { setError(`Still needed: ${need.join(', ')}`); return; }
    setBusy(true); setError('');
    const body = { name, phone, timeline: timeline || undefined, wantsVisit: visit, via: mode === 'agent' ? 'agent' as const : undefined };
    try { setDone(kind === 'project' ? await sendProjectEnquiry(slug, { ...body, interest: interest || undefined }) : await sendEnquiry(slug, body)); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  if (done) {
    const person = done.agent ?? done.seller ?? null;
    return (
      <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
        <Burst t={t} />
        <Text style={{ color: t.fg, fontWeight: '700', fontSize: 17 }}>{done.agent ? 'You are connected.' : person ? 'Your enquiry is sent.' : unclaimed ? 'Thank you. Our team has your details.' : 'Thank you. Your request is in.'}</Text>
        {person ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Call ${person.name}`} onPress={() => Linking.openURL(`tel:${person.phone}`)} style={[s.call, { borderColor: t.brand }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.muted, fontSize: 12 }}>{done.agent ? 'Your verified agent' : 'The seller'}</Text>
              <Text style={{ color: t.fg, fontWeight: '700' }}>{person.name}{done.agent?.firmName ? `, ${done.agent.firmName}` : ''}</Text>
            </View>
            <Text style={{ color: t.brand, fontWeight: '700', fontSize: 16 }}>📞 {person.phone}</Text>
          </Pressable>
        ) : <Text style={{ color: t.fg, lineHeight: 21 }}>{unclaimed ? `We will call you about ${about}. The builder has not joined us yet, so we will find out what we can for you.` : `You will get a call back about ${about}.`}</Text>}
        {person && (person.level ?? 0) >= 2
          ? <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}>We have verified this {done.agent ? 'agent' : 'seller'}{person.label ? ` (${person.label.toLowerCase()})` : ''}. Even so, do not pay a booking amount before you have seen the place and had its papers checked.</Text>
          : person ? <Text style={{ color: t.danger, fontSize: 13, lineHeight: 19 }}>We have not fully verified this seller yet. Do not pay a token, booking amount or any advance before you have seen the home and had its papers checked.</Text>
            : <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}>Do not pay a booking amount to anyone before you have seen the site and checked the RERA registration.</Text>}
      </View>
    );
  }

  const consentText = mode === 'agent' ? `Share my name and phone number with a verified agent selling ${about}, and with this app’s team.`
    : mode === 'seller' ? 'Share my name and phone number with the seller so they can contact me about this home.'
      : unclaimed ? `I agree to be contacted by phone about ${about} by this app’s team, who may pass my enquiry to the builder.` : `I agree to be contacted by phone about ${about} by the builder or this app’s team.`;
  return (
    <View style={{ gap: 12 }}>
      <LiveField t={t} label="Your name" value={name} onChange={setName} check={nameProblem} />
      <LiveField t={t} label="Phone" value={phone} onChange={setPhone} check={phoneProblem} phone hint="10 digits. Used only to call you about this." />

      {interests.length > 0 && (
        <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel="Interested in">
          {interests.map((x) => (
            <Pressable key={x} accessibilityRole="radio" accessibilityState={{ selected: interest === x }} onPress={() => setInterest(interest === x ? '' : x)} style={[s.chip, { borderColor: interest === x ? t.brand : t.line, backgroundColor: interest === x ? t.brand : t.card }]}>
              <Text style={{ color: interest === x ? t.brandInk : t.fg }}>{x}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>When do you plan to buy? <Text style={{ color: t.muted, fontWeight: '400' }}>(optional)</Text></Text>
        <View style={s.when} accessibilityRole="radiogroup">
          {TIMELINES.map(([code, label]) => {
            const on = timeline === code;
            return (
              <Pressable key={code} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setTimeline(on ? '' : code)} style={({ pressed }) => [s.whenCard, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.soft : t.card, borderWidth: on ? 2 : 1.5, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                <Text style={{ fontSize: on ? 26 : 22 }}>{WHEN_ICON[code]}</Text>
                <Text style={{ color: t.fg, fontSize: 13, fontWeight: on ? '700' : '400', textAlign: 'center' }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* The whole row is the control; the switch inside only shows the state, so a tap on it is not counted twice. */}
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: visit }} accessibilityLabel="Arrange a site visit" onPress={() => setVisit(!visit)} style={[s.toggle, { borderColor: visit ? t.brand : t.line, backgroundColor: visit ? t.soft : t.card }]}>
        <Text style={{ fontSize: 22 }}>🚗</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.fg, fontWeight: '700' }}>Arrange a site visit</Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>{visit ? 'We will ask which day suits you.' : 'Turn this on if you would like to see it in person.'}</Text>
        </View>
        <Toggle on={visit} />
      </Pressable>

      <Pressable accessibilityRole="switch" accessibilityState={{ checked: consent }} accessibilityLabel={consentText} onPress={() => setConsent(!consent)} style={[s.toggle, { borderStyle: consent ? 'solid' : 'dashed', borderColor: consent ? t.ready : t.line, backgroundColor: consent ? t.readyBg : 'transparent' }]}>
        <Text style={{ color: consent ? t.fg : t.muted, flex: 1, fontSize: 13, lineHeight: 19 }}>{consentText}</Text>
        <Toggle on={consent} color={t.ready} />
      </Pressable>

      <View style={{ gap: 6 }}>
        <View style={[s.track, { backgroundColor: t.line }]}><Animated.View style={{ height: '100%', borderRadius: 3, backgroundColor: ready ? t.ready : t.brand, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} /></View>
        <Text accessibilityLiveRegion="polite" style={{ color: error ? t.danger : t.muted, fontSize: 12 }}>{error || (ready ? 'All set.' : `Still needed: ${need.join(', ')}`)}</Text>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={({ pressed }) => [s.send, { backgroundColor: t.brand, opacity: busy ? 0.6 : ready ? 1 : 0.55, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <Text style={{ color: t.brandInk, fontWeight: '700', fontSize: 16 }}>{busy ? 'Sending…' : mode === 'agent' ? 'Connect me' : mode === 'seller' ? 'Get seller’s contact' : 'Request a call back'}</Text>
      </Pressable>
    </View>
  );
}

/** The button on a card or row. It opens the form in a sheet over the screen, so a buyer can ask without leaving the list. */
/** `fill` shares a row evenly with the button beside it, at the same height. `big` is the main button of a detail screen. */
export function ConnectButton({ kind, slug, name, mode, unclaimed, agents, fill, big, interests }: Props & { agents?: number; fill?: boolean; big?: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const filled = big || mode === 'agent';
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${TITLE[mode]}: ${name}`} onPress={() => setOpen(true)} style={({ pressed }) => [s.connect, fill && s.fill, big && s.big, { borderColor: t.brand, backgroundColor: filled ? t.brand : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
        <Text numberOfLines={fill ? 1 : undefined} style={{ color: filled ? t.brandInk : t.brand, fontWeight: '700', fontSize: big ? 16 : 14 }}>{mode === 'agent' ? '✓ ' : big ? `${ICON[mode]}  ` : ''}{mode === 'seller' ? 'Contact seller' : TITLE[mode]}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
          <Pressable style={{ flex: 1 }} accessibilityLabel="Close" onPress={() => setOpen(false)} />
          <View style={[s.sheet, { backgroundColor: t.bg }]}>
            <View style={[s.head, { backgroundColor: t.brand }]}>
              <View style={s.headIcon}><Text style={{ fontSize: 22 }}>{ICON[mode]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={{ color: t.brandInk, fontWeight: '800', fontSize: 17 }}>{TITLE[mode]}</Text>
                <Text numberOfLines={2} style={{ color: t.brandInk, opacity: 0.92, fontWeight: '600' }}>{name}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(false)} hitSlop={10} style={s.close}><Text style={{ color: t.brandInk, fontSize: 20, lineHeight: 22 }}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
              <Text style={{ color: t.muted, lineHeight: 20 }}>
                {mode === 'agent' ? `${agents && agents > 1 ? `${agents} agents we have verified sell this project.` : 'An agent we have verified sells this project.'} Leave your details and you will be shown one agent’s name and number; they will call you too.`
                  : mode === 'seller' ? 'Leave your details and you will be shown the seller’s name and phone number.'
                    : unclaimed ? 'Leave your details and our team will call you. The builder has not joined us yet, so we will find out prices and availability for you.' : 'Leave your details and you will get a call back.'}
              </Text>
              <LeadForm kind={kind} slug={slug} name={name} mode={mode} unclaimed={unclaimed} interests={interests} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  input: { fontSize: 16, paddingVertical: 2, paddingHorizontal: 0 },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  when: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  whenCard: { flexGrow: 1, flexBasis: '45%', alignItems: 'center', gap: 4, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  send: { borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  burst: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  call: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, padding: 12 },
  fill: { alignSelf: 'stretch', flexGrow: 1, flexBasis: 172, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  big: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 14 },
  connect: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,16,0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  headIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
});

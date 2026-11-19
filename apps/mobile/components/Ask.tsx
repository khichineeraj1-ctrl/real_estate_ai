import { CompareToggle } from './tools/Compare';
import { Cover } from './Cover';
import { ConnectButton } from './LeadForm';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ask, type AskResult, type Turn } from '../lib/api';
import { useTheme } from '../lib/theme';
import { createListener, speak, stopSpeaking } from '../lib/voice';
import { PropertyCard } from './PropertyCard';

/** A reply is written to be spoken, as one run of sentences. On screen: the first sentence alone, then two at a time. */
function paragraphs(reply: string): string[] {
  const sentences = reply.split(/(?<=[.!?])\s+(?=[A-Z₹"“(])/).map((x) => x.trim()).filter(Boolean);
  if (sentences.length < 3) return [reply];
  const out = [sentences[0]];
  for (let i = 1; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join(' '));
  return out;
}

interface Entry { question: string; result: AskResult | null; error?: string }

const EXAMPLES = ['3 BHK in Whitefield under 1.5 crore', 'Ready to move flats in Sector 57 Gurgaon', 'Average rate in Powai', 'Cheapest 2 BHK in Pune'];

/** The conversation: questions typed or spoken, answers shown and read aloud, matching homes as cards. */
export function Ask({ header }: { header?: React.ReactNode }) {
  const t = useTheme();
  const router = useRouter();
  const [thread, setThread] = useState<Entry[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [aloud, setAloud] = useState(true);
  const [listening, setListening] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const state = useRef({ thread, aloud, busy });
  state.current = { thread, aloud, busy };

  async function send(question: string) {
    const q = question.trim();
    if (!q || state.current.busy) return;
    setBusy(true);
    setText('');
    stopSpeaking();
    const history: Turn[] = state.current.thread.flatMap((e) => (e.result ? [{ role: 'user' as const, text: e.question }, { role: 'assistant' as const, text: e.result.reply }] : []));
    setThread((x) => [...x, { question: q, result: null }]);
    let entry: Entry;
    try {
      entry = { question: q, result: await ask(q, history) };
    } catch (e) {
      entry = { question: q, result: null, error: (e as Error).message };
    }
    setThread((x) => [...x.slice(0, -1), entry]);
    setBusy(false);
    if (entry.result && state.current.aloud) speak(entry.result.reply);
  }

  const listener = useMemo(() => createListener((heard, done) => {
    if (heard) setText(heard);
    if (done) { setListening(false); if (heard.trim()) void send(heard); }
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopSpeaking(); listener?.stop(); }, [listener]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={() => thread.length && scroll.current?.scrollToEnd({ animated: true })}>
        {thread.length === 0 ? (
          <View style={{ gap: 14 }}>
            {header}
            <Text style={[s.hero, { color: t.brand }]}>Ask. Find your home.</Text>
            <Text style={{ color: t.muted, fontSize: 16, lineHeight: 23 }}>Type or speak your question and get a straight answer about homes and builder projects in Gurgaon, Bengaluru, Mumbai and Pune.</Text>
            <View style={{ gap: 8, marginTop: 6 }}>
              {EXAMPLES.map((q) => (
                <Pressable key={q} accessibilityRole="button" onPress={() => send(q)} style={[s.chip, { borderColor: t.line, backgroundColor: t.soft }]}>
                  <Text style={{ color: t.fg, fontSize: 15 }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : thread.map((e, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Text style={[s.you, { backgroundColor: t.brand, color: t.brandInk }]}>{e.question}</Text>
            <View style={[s.answer, { backgroundColor: t.soft, borderColor: t.line }]}>
              {e.result ? (
                <>
                  <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
                    {paragraphs(e.result.reply).map((x, n) => <Text key={n} style={{ color: n === 0 ? t.fg : t.muted, fontSize: 16, lineHeight: 24, fontWeight: n === 0 ? '600' : '400' }}>{x}</Text>)}
                  </View>
                  {e.result.properties.map((p) => <PropertyCard key={p.slug} p={p} />)}
                  {(e.result.projects ?? []).map((p) => (
                    <View key={p.slug} style={{ borderWidth: 1, borderColor: t.line, backgroundColor: t.card, borderRadius: 14, padding: 12, gap: 8 }}>
                      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/project/[slug]', params: { slug: p.slug } })} style={({ pressed }) => ({ gap: 2, opacity: pressed ? 0.6 : 1 })}>
                        {p.photos?.[0] ? <Cover photo={p.photos[0]} label={`${p.name}: photo`} /> : null}
                        <Text style={{ color: t.fg, fontWeight: '600' }}>{p.name}</Text>
                        <Text style={{ color: t.muted, fontSize: 13 }}>{p.locality.name}, {p.city.name} · {p.brand?.name ?? p.builder}</Text>
                      </Pressable>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <ConnectButton kind="project" slug={p.slug} name={p.name} mode={(p.agents ?? 0) > 0 ? 'agent' : 'callback'} agents={p.agents} unclaimed={!!p.registerSource} fill />
                        <CompareToggle kind="projects" slug={p.slug} title={p.name} fill />
                      </View>
                    </View>
                  ))}
                  {(e.result.projectsTotal ?? 0) > (e.result.projects?.length ?? 0) && <Text style={{ color: t.muted, fontSize: 13 }}>Showing {e.result.projects!.length} of {e.result.projectsTotal} projects. Name an area to narrow it down.</Text>}
                  {e.result.total > e.result.properties.length && <Text style={{ color: t.muted, fontSize: 13 }}>Showing {e.result.properties.length} of {e.result.total}. Ask to narrow it down.</Text>}
                  {(() => {
                    // "X vs Y" for projects points at /compare/projects?ids=a,b; open the same comparison in the app.
                    const ids = /^\/compare\/projects\?ids=([a-z0-9,-]+)$/.exec(e.result.page?.path ?? '')?.[1];
                    return ids ? (
                      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/compare-projects', params: { ids } })} style={{ alignSelf: 'flex-start', borderWidth: 1.5, borderColor: t.brand, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                        <Text style={{ color: t.brand, fontWeight: '700' }}>See them side by side ›</Text>
                      </Pressable>
                    ) : null;
                  })()}
                  {(() => {
                    // An "X vs Y" answer points at /city/compare/a-vs-b; open the same comparison in the app.
                    const m = /^\/([a-z0-9-]+)\/compare\/([a-z0-9-]+-vs-[a-z0-9-]+)$/.exec(e.result.page?.path ?? '');
                    return m ? (
                      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/compare-localities/[city]/[pair]', params: { city: m[1], pair: m[2] } })} style={[s.chip, { borderColor: t.brand, backgroundColor: t.card }]}>
                        <Text style={{ color: t.brand, fontWeight: '600' }}>See the two side by side →</Text>
                      </Pressable>
                    ) : null;
                  })()}
                </>
              ) : e.error ? <Text style={{ color: t.danger }}>{e.error}</Text> : <ActivityIndicator color={t.brand} />}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[s.footer, { borderTopColor: t.line, backgroundColor: t.bg }]}>
        <View style={s.aloud}>
          <Text style={{ color: t.muted, fontSize: 13 }}>{listener ? 'Tap the mic to speak' : 'To speak, use the mic key on your keyboard'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: t.muted, fontSize: 13 }}>Read aloud</Text>
            <Switch accessibilityLabel="Read answers aloud" value={aloud} onValueChange={(v) => { setAloud(v); if (!v) stopSpeaking(); }} trackColor={{ true: t.brand, false: '#aeb6c2' }} />
          </View>
        </View>
        <View style={[s.bar, { borderColor: listening ? t.accent : t.line, backgroundColor: t.card }]}>
          <TextInput
            value={text} onChangeText={setText} onSubmitEditing={() => send(text)} returnKeyType="search" maxLength={300}
            placeholder={listening ? 'Listening…' : 'Ask anything about buying a home'} placeholderTextColor={t.muted} accessibilityLabel="Ask about homes for sale"
            style={[s.input, { color: t.fg }]}
          />
          {listener && (
            <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Ask by voice'} onPress={() => { if (listening) listener.stop(); else { stopSpeaking(); setListening(true); listener.start(); } }} style={[s.round, { backgroundColor: listening ? t.accent : t.soft }]}>
              <Text style={{ fontSize: 18 }}>🎙</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Ask" disabled={busy} onPress={() => send(text)} style={[s.send, { backgroundColor: t.brand, opacity: busy ? 0.6 : 1 }]}>
            <Text style={{ color: t.brandInk, fontWeight: '700' }}>Ask</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, gap: 18, paddingBottom: 24 },
  hero: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  you: { alignSelf: 'flex-end', maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderBottomRightRadius: 4, overflow: 'hidden', fontSize: 16 },
  answer: { borderWidth: 1, borderRadius: 18, borderTopLeftRadius: 4, padding: 14, gap: 10 },
  footer: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12, gap: 6 },
  aloud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  bar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 999, padding: 5, gap: 6 },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingHorizontal: 12, paddingVertical: 10 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  send: { height: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccount, requestCode, saveItem, unsaveItem, verifyCode, type Account } from '../lib/api';
import { startSession, useSession } from '../lib/session';
import { useTheme } from '../lib/theme';

// What the signed-in buyer has saved, shared by every save button on screen.
let account: Account | null = null;
let asked: Promise<void> | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((l) => l());
export function refreshAccount(): Promise<void> {
  asked = getAccount().then((a) => { account = a; tell(); }).catch(() => { account = null; tell(); });
  return asked;
}
export function forgetAccount() { account = null; asked = null; tell(); }
export function useAccount(): Account | null {
  const { signedIn } = useSession();
  const [, bump] = useState(0);
  useEffect(() => { const l = () => bump((n) => n + 1); listeners.add(l); if (signedIn && !asked) void refreshAccount(); return () => { listeners.delete(l); }; }, [signedIn]);
  return signedIn ? account : null;
}

/** Sign in with a code sent by email: no password. */
export function SignIn({ onDone }: { onDone?: () => void }) {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const run = async (f: () => Promise<void>) => { setBusy(true); setError(''); try { await f(); } catch (e) { setError((e as Error).message); } setBusy(false); };
  const send = () => run(async () => { await requestCode(email.trim()); setStep('code'); });
  const check = () => run(async () => { const r = await verifyCode(email.trim(), code); await startSession(r.token, r.email); await refreshAccount(); onDone?.(); });
  const ready = step === 'email' ? okEmail : code.replace(/\D/g, '').length === 6;
  return (
    <View style={{ gap: 10 }}>
      {step === 'email' ? (
        <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={t.muted} accessibilityLabel="Your email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={[s.input, { borderColor: t.line, color: t.fg, backgroundColor: t.card }]} />
      ) : (
        <>
          <Text style={{ color: t.muted, lineHeight: 20 }}>We sent a six-digit code to <Text style={{ color: t.fg, fontWeight: '700' }}>{email.trim()}</Text>. It works for ten minutes.</Text>
          <TextInput value={code} onChangeText={setCode} placeholder="000000" placeholderTextColor={t.muted} accessibilityLabel="Sign-in code" keyboardType="number-pad" maxLength={7} autoComplete="one-time-code" autoFocus style={[s.input, { borderColor: t.line, color: t.fg, backgroundColor: t.card, fontSize: 24, letterSpacing: 8, textAlign: 'center' }]} />
        </>
      )}
      {error ? <Text accessibilityRole="alert" style={{ color: t.danger }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready || busy }} disabled={!ready || busy} onPress={step === 'email' ? send : check} style={[s.go, { backgroundColor: ready ? t.brand : t.line }]}>
        <Text style={{ color: ready ? t.brandInk : t.muted, fontWeight: '700', fontSize: 16 }}>{busy ? 'One moment…' : step === 'email' ? 'Email me a sign-in code' : 'Sign in'}</Text>
      </Pressable>
      {step === 'code' ? <Pressable accessibilityRole="button" onPress={() => { setStep('email'); setCode(''); setError(''); }}><Text style={{ color: t.brand, textAlign: 'center' }}>Use a different email</Text></Pressable> : null}
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>No password. We use your email only to sign you in and for alerts you ask for.</Text>
    </View>
  );
}

/** The heart on a project or home. Signed in, it saves; signed out, it sends you to sign in. */
export function SaveButton({ kind, slug, name }: { kind: 'project' | 'property'; slug: string; name: string }) {
  const t = useTheme();
  const router = useRouter();
  const { signedIn } = useSession();
  const acc = useAccount();
  const [busy, setBusy] = useState(false);
  const on = !!acc?.saved.some((x) => x.kind === kind && x.slug === slug);
  const press = async () => {
    if (!signedIn) { router.push('/account'); return; }
    setBusy(true);
    try { await (on ? unsaveItem(kind, slug) : saveItem(kind, slug)); await refreshAccount(); } catch { /* the button simply stays as it was */ }
    setBusy(false);
  };
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on, busy }} accessibilityLabel={on ? `Remove ${name} from saved` : `Save ${name}`} disabled={busy} onPress={press} style={[s.save, { borderColor: on ? '#e5484d' : t.line, backgroundColor: t.card, opacity: busy ? 0.6 : 1 }]}>
      <Text style={{ color: '#e5484d', fontSize: 16 }}>{on ? '♥' : '♡'}</Text>
      <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>{on ? 'Saved' : signedIn ? 'Save' : 'Sign in to save'}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  go: { borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  save: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
});

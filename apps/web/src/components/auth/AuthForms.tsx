'use client';

import Link from 'next/link';
import { useActionState, useId, useState } from 'react';
import { forgotPassword, login, register, resetPassword, type FormState } from '@/app/admin/actions';

/* ---------- Checks that run as the person types. Each returns what is wrong, or null when the value is fine. ---------- */

const checkName = (v: string) => (v.trim().length >= 2 ? null : 'Enter your name');
const checkEmail = (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Enter an email like name@example.com');
const digits = (v: string) => v.replace(/[\s()+-]/g, '');
const checkPhone = (v: string) => (/^\d{10,13}$/.test(digits(v)) ? null : `${digits(v).length} of 10 digits`);
const checkPassword = (v: string) => (v.length >= 10 ? null : `${v.length} of 10 characters`);

/** A rough guide to how hard a password is to guess. Only the length rule is enforced; the rest is encouragement. */
function strength(v: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (v.length < 10) return { score: v ? 1 : 0, label: v ? 'Too short' : '' };
  let s = 2;
  if (v.length >= 14) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v) && s < 4) s++;
  const score = Math.min(s, 4) as 2 | 3 | 4;
  return { score, label: { 2: 'Fair', 3: 'Good', 4: 'Strong' }[score] };
}

/* ---------- One field: floating label, a tick when it is right, the problem once the person has left it ---------- */

interface FieldProps {
  label: string; name: string; value: string; onChange: (v: string) => void; check?: (v: string) => string | null;
  type?: 'text' | 'email' | 'tel' | 'password'; autoComplete?: string; hint?: string; meter?: boolean; autoFocus?: boolean;
}

function Field({ label, name, value, onChange, check, type = 'text', autoComplete, hint, meter, autoFocus }: FieldProps) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const problem = check ? check(value) : null;
  const ok = !!check && !!value && !problem; // no tick on a field we cannot judge, such as the password when signing in
  const bad = touched && !!value && !!problem;
  const password = type === 'password';
  const st = meter ? strength(value) : null;
  // While typing, the live count ("7 of 10 characters") is a guide; after leaving the field it is shown as a problem.
  const note = bad ? problem : value && problem && !touched ? problem : caps ? 'Caps Lock is on' : hint;
  return (
    <div className={`fld ${ok ? 'is-ok' : ''} ${bad ? 'is-bad' : ''}`}>
      <div className="fld-box">
        <input
          id={id} name={name} type={password && shown ? 'text' : type} value={value} placeholder=" " required autoFocus={autoFocus}
          autoComplete={autoComplete} inputMode={type === 'tel' ? 'tel' : undefined} aria-invalid={bad || undefined} aria-describedby={`${id}-note`}
          onChange={(e) => onChange(e.target.value)} onBlur={() => { setTouched(true); setCaps(false); }}
          onKeyUp={password ? (e) => setCaps(e.getModifierState('CapsLock')) : undefined}
        />
        <label htmlFor={id}>{label}</label>
        {password && (
          <button type="button" className="fld-eye" onClick={() => setShown((s) => !s)} aria-pressed={shown} aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
        <span className="fld-tick" aria-hidden="true">✓</span>
      </div>
      {st && (
        <div className={`meter meter-${st.score}`} aria-hidden="true"><span /><span /><span /><span /></div>
      )}
      <p id={`${id}-note`} className="fld-note" aria-live="polite">
        {st && st.label && !bad ? <><strong>{st.label}.</strong> {st.score < 4 ? 'A longer phrase with a number or symbol is stronger.' : 'Nice.'}</> : note}
      </p>
    </div>
  );
}

function Submit({ pending, children, pendingLabel }: { pending: boolean; children: React.ReactNode; pendingLabel: string }) {
  return (
    <button type="submit" className="auth-submit" disabled={pending}>
      {pending && <span className="spin" aria-hidden="true" />}
      {pending ? pendingLabel : children}
    </button>
  );
}

const Problem = ({ state }: { state: FormState }) => (state.error ? <p role="alert" className="auth-error">{state.error}</p> : null);

/* ---------- Sign up ---------- */

const KINDS = [
  { value: 'OWNER', icon: '🏠', name: 'Owner', text: 'Selling my own home' },
  { value: 'AGENT', icon: '🤝', name: 'Agent', text: 'Selling for clients' },
  { value: 'BUILDER', icon: '🏗️', name: 'Builder', text: 'A developer’s sales office' },
] as const;

export function SignupForm() {
  const [state, run, pending] = useActionState(register, {});
  const [kind, setKind] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const done = [!!kind, !checkName(name), !checkPhone(phone), !checkEmail(email), !checkPassword(password)].filter(Boolean).length;
  return (
    <form action={run} className="auth-form" noValidate={false}>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={done} aria-label="Sign-up progress">
        <span style={{ width: `${(done / 5) * 100}%` }} />
      </div>
      <p className="progress-text">{done === 5 ? 'All set. Create your account.' : `${done} of 5 done`}</p>
      <Problem state={state} />

      <fieldset className="kinds">
        <legend>I am</legend>
        {KINDS.map((k) => (
          <label key={k.value} className={`kind ${kind === k.value ? 'is-on' : ''}`}>
            <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} required />
            <span className="kind-icon" aria-hidden="true">{k.icon}</span>
            <strong>{k.name}</strong>
            <small>{k.text}</small>
          </label>
        ))}
      </fieldset>

      <Field label="Your name" name="name" value={name} onChange={setName} check={checkName} autoComplete="name" />
      <Field label="Phone" name="phone" type="tel" value={phone} onChange={setPhone} check={checkPhone} autoComplete="tel" hint="Our team may call this number to verify you. Not shown to buyers until they enquire." />
      <Field label="Email" name="email" type="email" value={email} onChange={setEmail} check={checkEmail} autoComplete="email" hint="We send a link to confirm it." />
      <Field label="Password" name="password" type="password" value={password} onChange={setPassword} check={checkPassword} autoComplete="new-password" hint="At least 10 characters." meter />

      <Submit pending={pending} pendingLabel="Creating your account…">Create account</Submit>
      <p className="auth-alt">Already have an account? <Link href="/admin/login">Sign in</Link></p>
    </form>
  );
}

/* ---------- Sign in ---------- */

export function LoginForm() {
  const [state, run, pending] = useActionState(login, {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <form action={run} className="auth-form">
      <Problem state={state} />
      <Field label="Email" name="email" type="email" value={email} onChange={setEmail} check={checkEmail} autoComplete="username" autoFocus />
      <Field label="Password" name="password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      <Submit pending={pending} pendingLabel="Signing in…">Sign in</Submit>
      <p className="auth-alt"><Link href="/admin/forgot">Forgot your password?</Link></p>
      <p className="auth-alt">Want to list a property? <Link href="/post-property">Create an account</Link></p>
    </form>
  );
}

/* ---------- Forgot password ---------- */

export function ForgotForm() {
  const [state, run, pending] = useActionState(forgotPassword, {});
  const [email, setEmail] = useState('');
  if (state.ok) {
    return (
      <div className="auth-done" role="status">
        <span className="auth-done-icon" aria-hidden="true">✉️</span>
        <p><strong>Check your inbox.</strong></p>
        <p>{state.ok}</p>
        <p className="auth-alt"><Link href="/admin/login">Back to sign in</Link></p>
      </div>
    );
  }
  return (
    <form action={run} className="auth-form">
      <Problem state={state} />
      <Field label="Email" name="email" type="email" value={email} onChange={setEmail} check={checkEmail} autoComplete="username" autoFocus />
      <Submit pending={pending} pendingLabel="Sending…">Send me the link</Submit>
      <p className="auth-alt"><Link href="/admin/login">Back to sign in</Link></p>
    </form>
  );
}

/* ---------- Choose a new password ---------- */

export function ResetForm({ token }: { token: string }) {
  const [state, run, pending] = useActionState(resetPassword.bind(null, token), {});
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  return (
    <form action={run} className="auth-form">
      <Problem state={state} />
      <Field label="New password" name="password" type="password" value={password} onChange={setPassword} check={checkPassword} autoComplete="new-password" hint="At least 10 characters." meter autoFocus />
      <Field label="New password again" name="again" type="password" value={again} onChange={setAgain} check={(v) => (v === password ? null : 'The two passwords do not match yet')} autoComplete="new-password" />
      <Submit pending={pending} pendingLabel="Saving…">Save new password</Submit>
    </form>
  );
}

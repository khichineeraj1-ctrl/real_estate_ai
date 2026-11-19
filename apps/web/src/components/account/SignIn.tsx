'use client';

import { useActionState } from 'react';
import { signIn, type SignInState } from '@/app/(site)/account/actions';

/** Sign in with a code sent by email: no password to make or forget. */
export function SignIn({ next }: { next?: string }) {
  const [state, run, pending] = useActionState<SignInState, FormData>(signIn, {});
  const waiting = state.step === 'code';
  return (
    <form action={run} className="signin">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      {!waiting ? (
        <>
          <label className="afield"><span>Your email</span><input type="email" name="email" required autoFocus autoComplete="email" placeholder="you@example.com" /></label>
          <button type="submit" className="abtn" disabled={pending}>{pending ? 'Sending…' : 'Email me a sign-in code'}</button>
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={state.email} />
          <p className="signin-sent">We sent a six-digit code to <strong>{state.email}</strong>. It works for ten minutes.</p>
          <label className="afield"><span>Code</span><input className="signin-code" name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="000000" /></label>
          <button type="submit" className="abtn" disabled={pending}>{pending ? 'Checking…' : 'Sign in'}</button>
        </>
      )}
      <p className="calc-note">No password. We use your email only to sign you in and for alerts you ask for.</p>
    </form>
  );
}

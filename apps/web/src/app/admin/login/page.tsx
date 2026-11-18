import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { BRAND } from '@/lib/seo';
import { login } from '../actions';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; verify?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="wrap alogin">
      <p><Link href="/" className="logo"><span className="orb" aria-hidden="true" />{BRAND}</Link></p>
      <h1>Sign in</h1>
      <p className="lead">For our team, for owners and agents managing their listings, and for builders viewing their leads.</p>
      {sp.reset && <p role="status" className="anotice">Your password is changed. Sign in with the new one.</p>}
      {sp.verify === 'ok' && <p role="status" className="anotice">Your email is confirmed. Sign in to post your property.</p>}
      {sp.verify === 'failed' && <p role="alert" className="aerror">That confirmation link has expired or was already used. Sign in and ask for a new one.</p>}
      <AdminForm action={login} submit="Sign in" pendingLabel="Signing in…">
        <Field label="Email" name="email" type="email" autoComplete="username" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
      </AdminForm>
      <p><Link href="/admin/forgot">Forgot your password?</Link></p>
      <p>Want to list a property? <Link href="/post-property">Create an account</Link>.</p>
    </main>
  );
}

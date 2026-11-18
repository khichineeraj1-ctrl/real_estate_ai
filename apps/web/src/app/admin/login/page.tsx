import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { BRAND } from '@/lib/seo';
import { login } from '../actions';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="wrap alogin">
      <p><Link href="/" className="logo"><span className="orb" aria-hidden="true" />{BRAND}</Link></p>
      <h1>Sign in</h1>
      <p className="lead">For our team, and for owners and agents managing their listings.</p>
      <AdminForm action={login} submit="Sign in" pendingLabel="Signing in…">
        <Field label="Email" name="email" type="email" autoComplete="username" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
      </AdminForm>
      <p>Want to list a property? <Link href="/post-property">Create an account</Link>.</p>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { BRAND } from '@/lib/seo';
import { forgotPassword } from '../actions';

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <main className="wrap alogin">
      <p><Link href="/" className="logo"><span className="orb" aria-hidden="true" />{BRAND}</Link></p>
      <h1>Forgot your password?</h1>
      <p className="lead">Enter the email you signed up with and we will send a link to choose a new one.</p>
      <AdminForm action={forgotPassword} submit="Send the link" pendingLabel="Sending…">
        <Field label="Email" name="email" type="email" autoComplete="username" />
      </AdminForm>
      <p><Link href="/admin/login">Back to sign in</Link></p>
    </main>
  );
}

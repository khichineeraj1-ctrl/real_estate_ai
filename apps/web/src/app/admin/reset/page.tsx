import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { BRAND } from '@/lib/seo';
import { resetPassword } from '../actions';

// The address holds a one-time secret, so it must not be sent on to other sites when a link is followed.
export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? '';
  return (
    <main className="wrap alogin">
      <p><Link href="/" className="logo"><span className="orb" aria-hidden="true" />{BRAND}</Link></p>
      <h1>Choose a new password</h1>
      {token ? (
        <AdminForm action={resetPassword.bind(null, token)} submit="Save new password">
          <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters." />
          <Field label="New password again" name="again" type="password" autoComplete="new-password" />
        </AdminForm>
      ) : <p className="lead">This link is incomplete. <Link href="/admin/forgot">Ask for a new one</Link>.</p>}
    </main>
  );
}

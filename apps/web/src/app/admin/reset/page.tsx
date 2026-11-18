import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetForm } from '@/components/auth/AuthForms';

// The address holds a one-time secret, so it must not be sent on to other sites when a link is followed.
export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? '';
  return (
    <AuthShell
      title="Choose a new password"
      lead="Pick something you do not use anywhere else."
      kicker="A good password, quickly"
      points={[
        { icon: '📏', title: 'Longer is stronger', text: 'A short phrase beats a clever word.' },
        { icon: '🔢', title: 'Mix it up', text: 'A number or symbol helps.' },
        { icon: '🚫', title: 'Make it unique', text: 'Not the one from your email or bank.' },
      ]}
    >
      {token ? <ResetForm token={token} /> : <p className="auth-lead">This link is incomplete. <Link href="/admin/forgot">Ask for a new one</Link>.</p>}
    </AuthShell>
  );
}

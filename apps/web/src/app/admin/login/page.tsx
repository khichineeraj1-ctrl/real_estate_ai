import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; verify?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      lead="Sign in to manage listings, leads and verification."
      kicker="One sign-in for everyone who works with us"
      points={[
        { icon: '🏠', title: 'Owners and agents', text: 'Post homes, add photos, answer buyers.' },
        { icon: '🏗️', title: 'Builders', text: 'See the leads on your projects.' },
        { icon: '🛡️', title: 'Our team', text: 'Review listings, verify sellers, follow up.' },
      ]}
    >
      {sp.reset && <p role="status" className="anotice">Your password is changed. Sign in with the new one.</p>}
      {sp.verify === 'ok' && <p role="status" className="anotice">Your email is confirmed. Sign in to post your property.</p>}
      {sp.verify === 'failed' && <p role="alert" className="auth-error">That confirmation link has expired or was already used. Sign in and ask for a new one.</p>}
      <LoginForm />
    </AuthShell>
  );
}

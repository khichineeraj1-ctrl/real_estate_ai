import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      lead="Enter the email you signed up with and we will send a link to choose a new one."
      kicker="Back in within a couple of minutes"
      points={[
        { icon: '✉️', title: 'We email you a link', text: 'It works once, for one hour.' },
        { icon: '🔑', title: 'You choose a new password', text: 'At least 10 characters.' },
        { icon: '🚪', title: 'Other devices are signed out', text: 'So only you are signed in afterwards.' },
      ]}
    >
      <ForgotForm />
    </AuthShell>
  );
}

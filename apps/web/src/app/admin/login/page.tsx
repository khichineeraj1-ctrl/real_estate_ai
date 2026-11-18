import type { Metadata } from 'next';
import { AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { login } from '../actions';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="alogin">
      <h1>Admin sign in</h1>
      <AdminForm action={login} submit="Sign in">
        <Field label="Email" name="email" type="email" autoComplete="username" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
      </AdminForm>
    </div>
  );
}

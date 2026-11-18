import { AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { getMe } from '@/lib/admin';
import { changePassword } from '../../actions';

export const metadata = { title: 'Your account' };

export default async function Account() {
  const me = await getMe();
  return (
    <>
      <h1>Your account</h1>
      <p className="lead">{me.name} · {me.email}{me.phone ? ` · ${me.phone}` : ''}</p>
      <h2>Change password</h2>
      <AdminForm action={changePassword} submit="Change password">
        <Field label="Current password" name="current" type="password" autoComplete="current-password" />
        <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters." />
        <Field label="New password again" name="again" type="password" autoComplete="new-password" />
      </AdminForm>
    </>
  );
}

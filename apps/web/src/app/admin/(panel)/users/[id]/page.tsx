import Link from 'next/link';
import { AdminForm } from '@/components/admin/Form';
import { Field, Select } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { save } from '../../../actions';

interface User { id: string; email: string; name: string; phone: string | null; role: string; active: boolean }
const ROLES = [{ value: 'ADMIN', label: 'Admin: everything, including users' }, { value: 'EDITOR', label: 'Editor: all content and approvals' }, { value: 'AGENT', label: 'Owner / agent: only their own listings' }, { value: 'BUILDER', label: 'Builder: only leads on projects linked to them' }];

export default async function EditUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = id === 'new' ? (await adminGet('/users'), null) : await adminGet<User>(`/users/${encodeURIComponent(id)}`);
  return (
    <>
      <p><Link href="/admin/users">← Users</Link></p>
      <h1>{u ? `Edit ${u.name}` : 'Add a user'}</h1>
      {u && <p className="lead">{u.email}. The email cannot be changed.</p>}
      <AdminForm action={save.bind(null, 'users', u?.id ?? null)} submit={u ? 'Save changes' : 'Add user'}>
        <Field label="Name" name="name" defaultValue={u?.name} maxLength={80} autoComplete="off" />
        {!u && <Field label="Email" name="email" type="email" autoComplete="off" />}
        <Field label="Phone" name="phone" required={false} defaultValue={u?.phone} autoComplete="off" />
        <Select label="Role" name="role" defaultValue={u?.role ?? 'EDITOR'} options={ROLES} />
        {u && <Select label="Status" name="active" defaultValue={String(u.active)} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated: cannot sign in' }]} />}
        <Field label={u ? 'New password' : 'Password'} name="password" type="password" required={!u} autoComplete="new-password" hint={u ? 'Leave empty to keep the current password. At least 10 characters.' : 'At least 10 characters. Share it with them privately; they can change it under their name in the header.'} />
      </AdminForm>
      {u && <p className="lead">Accounts are deactivated, not deleted, so their listings and history stay intact.</p>}
    </>
  );
}

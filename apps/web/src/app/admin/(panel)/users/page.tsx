import Link from 'next/link';
import { Notice } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { day } from '@/lib/format';

export const metadata = { title: 'Users' };
interface Row { id: string; email: string; name: string; phone: string | null; role: string; active: boolean; createdAt: string; _count: { properties: number; projects: number } }
const ROLE: Record<string, string> = { ADMIN: 'Admin', EDITOR: 'Editor', AGENT: 'Owner / agent', BUILDER: 'Builder' };

export default async function Users({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const rows = await adminGet<Row[]>('/users');
  return (
    <>
      <div className="ahead"><h1>Users</h1><Link className="abtn" href="/admin/users/new">Add a user</Link></div>
      <Notice params={await searchParams} />
      <p className="lead">Admins can do everything. Editors manage all content and approve listings, but cannot manage users. Owners and agents sign themselves up and only manage their own listings. Builders are added here, then linked to their projects on each project’s page, and only see those projects’ leads.</p>
      <div className="atable"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Listings</th><th>Projects</th><th>Status</th><th>Joined</th></tr></thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td><Link href={`/admin/users/${u.id}`}>{u.name}</Link></td><td>{u.email}</td><td>{ROLE[u.role]}</td><td>{u._count.properties}</td><td>{u._count.projects}</td>
              <td><span className={`tag ${u.active ? 'tag-ready' : ''}`}>{u.active ? 'Active' : 'Deactivated'}</span></td><td>{day(u.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}

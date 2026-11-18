import Link from 'next/link';
import { adminGet, requireStaff } from '@/lib/admin';

export const metadata = { title: 'Builder pages' };

interface Row { id: string; slug: string; name: string; _count: { projects: number } }

export default async function BuilderPages({ searchParams }: { searchParams: Promise<{ saved?: string; merged?: string; q?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const all = await adminGet<Row[]>('/builder-pages');
  const q = (sp.q ?? '').trim().toLowerCase();
  const rows = q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all;
  return (
    <>
      <div className="ahead"><h1>Builder pages</h1></div>
      <p className="lead">One page per builder at /builders/…, listing its projects. Companies with the same name written differently are joined automatically. Where two pages are really one builder (companies of the same group), open one and merge it into the other.</p>
      {sp.saved && <p role="status" className="astatus">Saved.</p>}
      {sp.merged && <p role="status" className="astatus">Merged. The projects now sit under the other builder, and their old addresses lead to the new ones.</p>}
      <form className="asearch" action="/admin/builder-pages"><input type="search" name="q" defaultValue={sp.q} placeholder="Find a builder by name" aria-label="Find a builder by name" /></form>
      <div className="atable"><table>
        <thead><tr><th>Builder</th><th>Projects</th><th>Public page</th></tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td><Link href={`/admin/builder-pages/${b.id}`}>{b.name}</Link></td><td>{b._count.projects}</td>
              <td>{b._count.projects ? <Link href={`/builders/${b.slug}`}>/builders/{b.slug}</Link> : <small>No projects, so no page</small>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={3}>No builder matches “{sp.q}”.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}

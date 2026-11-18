import Link from 'next/link';
import { Notice } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { statusLabel } from '@/lib/format';

export const metadata = { title: 'Projects' };
interface Row { id: string; slug: string; name: string; builder: string; status: string; locality: { name: string; city: { name: string } }; _count: { properties: number } }

export default async function Projects({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const rows = await adminGet<Row[]>('/projects');
  return (
    <>
      <div className="ahead"><h1>Projects</h1><Link className="abtn" href="/admin/projects/new">Add a project</Link></div>
      <Notice params={await searchParams} />
      <div className="atable"><table>
        <thead><tr><th>Project</th><th>Builder</th><th>Where</th><th>Status</th><th>Listings</th><th><span className="sr">Actions</span></th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/projects/${p.id}`}>{p.name}</Link></td><td>{p.builder}</td><td>{p.locality.name}, {p.locality.city.name}</td>
              <td>{statusLabel(p.status)}</td><td>{p._count.properties}</td><td><Link href={`/projects/${p.slug}`}>View page</Link></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}

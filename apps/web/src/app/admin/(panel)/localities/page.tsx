import Link from 'next/link';
import { Notice } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';

export const metadata = { title: 'Localities' };
interface Row { id: string; slug: string; name: string; city: { slug: string; name: string }; _count: { properties: number; projects: number } }

export default async function Localities({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const rows = await adminGet<Row[]>('/localities');
  return (
    <>
      <div className="ahead"><h1>Localities</h1><Link className="abtn" href="/admin/localities/new">Add a locality</Link></div>
      <Notice params={await searchParams} />
      <div className="atable"><table>
        <thead><tr><th>Locality</th><th>City</th><th>Listings</th><th>Projects</th><th><span className="sr">Actions</span></th></tr></thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id}>
              <td><Link href={`/admin/localities/${l.id}`}>{l.name}</Link></td><td>{l.city.name}</td><td>{l._count.properties}</td><td>{l._count.projects}</td>
              <td><Link href={`/${l.city.slug}/${l.slug}`}>View page</Link></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}

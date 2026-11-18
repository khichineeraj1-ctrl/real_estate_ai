import Link from 'next/link';
import { Notice } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';

export const metadata = { title: 'Cities' };
interface Row { id: string; slug: string; name: string; state: string; _count: { localities: number } }

export default async function Cities({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const rows = await adminGet<Row[]>('/cities');
  return (
    <>
      <div className="ahead"><h1>Cities</h1><Link className="abtn" href="/admin/cities/new">Add a city</Link></div>
      <Notice params={await searchParams} />
      <div className="atable"><table>
        <thead><tr><th>City</th><th>State</th><th>Localities</th><th><span className="sr">Actions</span></th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}><td><Link href={`/admin/cities/${c.id}`}>{c.name}</Link></td><td>{c.state}</td><td>{c._count.localities}</td><td><Link href={`/${c.slug}`}>View page</Link></td></tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}

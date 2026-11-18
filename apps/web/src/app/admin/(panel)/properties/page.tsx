import Link from 'next/link';
import { Notice } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { day, price, statusLabel } from '@/lib/format';

export const metadata = { title: 'Listings' };
interface Row { id: string; slug: string; title: string; priceInr: number; areaSqft: number; status: string; postedAt: string; locality: { name: string; city: { name: string } } }
interface Data { items: Row[]; total: number; page: number; pageSize: number }

export default async function Properties({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; saved?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const d = await adminGet<Data>(`/properties?q=${encodeURIComponent(q)}&page=${encodeURIComponent(sp.page ?? '1')}`);
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize));
  const link = (p: number) => `/admin/properties?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${p}`;
  return (
    <>
      <div className="ahead"><h1>Listings</h1><Link className="abtn" href="/admin/properties/new">Add a listing</Link></div>
      <Notice params={sp} />
      <form className="asearch" role="search">
        <input name="q" defaultValue={q} placeholder="Search by title" aria-label="Search listings by title" />
        <button type="submit" className="abtn quiet">Search</button>
      </form>
      <p>{d.total.toLocaleString('en-IN')} {d.total === 1 ? 'listing' : 'listings'}{q && <> matching “{q}” · <Link href="/admin/properties">clear</Link></>}</p>
      <div className="atable"><table>
        <thead><tr><th>Title</th><th>Price</th><th>Status</th><th>Listed</th><th><span className="sr">Actions</span></th></tr></thead>
        <tbody>
          {d.items.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/properties/${p.id}`}>{p.title}</Link></td>
              <td>{price(p.priceInr)}</td><td>{statusLabel(p.status)}</td><td>{day(p.postedAt)}</td>
              <td><Link href={`/property/${p.slug}`}>View page</Link></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {pages > 1 && <p className="apager">{d.page > 1 && <Link href={link(d.page - 1)}>← Previous</Link>} Page {d.page} of {pages} {d.page < pages && <Link href={link(d.page + 1)}>Next →</Link>}</p>}
    </>
  );
}

import Link from 'next/link';
import { Notice } from '@/components/admin/fields';
import { adminGet, getMe, isStaff } from '@/lib/admin';
import { day, price } from '@/lib/format';

export const metadata = { title: 'Listings' };
type State = 'PUBLISHED' | 'PENDING' | 'REJECTED';
interface Row { id: string; slug: string; title: string; priceInr: number; status: string; state: State; postedAt: string; owner: { name: string } | null; _count: { photos: number } }
interface Data { items: Row[]; total: number; pending: number; page: number; pageSize: number }

const STATE_LABEL: Record<State, string> = { PUBLISHED: 'Live', PENDING: 'Waiting for review', REJECTED: 'Needs changes' };

export default async function Properties({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; page?: string; saved?: string; deleted?: string; reviewed?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const state = (['PUBLISHED', 'PENDING', 'REJECTED'] as const).find((s) => s === sp.state) ?? '';
  const [me, d] = await Promise.all([getMe(), adminGet<Data>(`/properties?q=${encodeURIComponent(q)}&state=${state}&page=${encodeURIComponent(sp.page ?? '1')}`)]);
  const staff = isStaff(me.role);
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize));
  const link = (o: { state?: string; page?: number }) => `/admin/properties?${new URLSearchParams({ ...(q ? { q } : {}), ...((o.state ?? state) ? { state: o.state ?? state } : {}), ...(o.page ? { page: String(o.page) } : {}) })}`;
  return (
    <>
      <div className="ahead"><h1>{staff ? 'Listings' : 'My listings'}</h1><Link className="abtn" href="/admin/properties/new">{staff ? 'Add a listing' : 'Post a property'}</Link></div>
      <Notice params={sp} />
      {sp.reviewed && <p role="status" className="anotice">{sp.reviewed === 'approve' ? 'Approved. The listing is live.' : 'Rejected. The owner can see your reason and resubmit.'}</p>}
      <p className="afilter">
        <Link href={`/admin/properties${q ? `?q=${encodeURIComponent(q)}` : ''}`} aria-current={state ? undefined : 'page'}>All</Link>
        <Link href={link({ state: 'PUBLISHED' })} aria-current={state === 'PUBLISHED' ? 'page' : undefined}>Live</Link>
        <Link href={link({ state: 'PENDING' })} aria-current={state === 'PENDING' ? 'page' : undefined}>Waiting for review ({d.pending})</Link>
        <Link href={link({ state: 'REJECTED' })} aria-current={state === 'REJECTED' ? 'page' : undefined}>Needs changes</Link>
      </p>
      <form className="asearch" role="search">
        {state && <input type="hidden" name="state" value={state} />}
        <input name="q" defaultValue={q} placeholder="Search by title" aria-label="Search listings by title" />
        <button type="submit" className="abtn quiet">Search</button>
      </form>
      <p>{d.total.toLocaleString('en-IN')} {d.total === 1 ? 'listing' : 'listings'}{q && <> matching “{q}”</>}</p>
      {d.items.length > 0 && (
        <div className="atable"><table>
          <thead><tr><th>Title</th><th>Price</th><th>State</th><th>Photos</th>{staff && <th>Posted by</th>}<th>Date</th><th><span className="sr">Actions</span></th></tr></thead>
          <tbody>
            {d.items.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/properties/${p.id}`}>{p.title}</Link></td>
                <td>{price(p.priceInr)}</td>
                <td><span className={`tag ${p.state === 'PUBLISHED' ? 'tag-ready' : ''}`}>{STATE_LABEL[p.state]}</span></td>
                <td>{p._count.photos}</td>
                {staff && <td>{p.owner?.name ?? '—'}</td>}
                <td>{day(p.postedAt)}</td>
                <td>{p.state === 'PUBLISHED' ? <Link href={`/property/${p.slug}`}>View page</Link> : staff && p.state === 'PENDING' ? <Link href={`/admin/properties/${p.id}`}>Review</Link> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {pages > 1 && <p className="apager">{d.page > 1 && <Link href={link({ page: d.page - 1 })}>← Previous</Link>} Page {d.page} of {pages} {d.page < pages && <Link href={link({ page: d.page + 1 })}>Next →</Link>}</p>}
    </>
  );
}

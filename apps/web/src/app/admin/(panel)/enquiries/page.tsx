import Link from 'next/link';
import { adminGet, getMe, isStaff } from '@/lib/admin';

export const metadata = { title: 'Enquiries' };
interface Row { id: string; name: string; phone: string; email: string | null; message: string | null; createdAt: string; property: { id: string; slug: string; title: string; state: string } }
interface Data { items: Row[]; total: number; page: number; pageSize: number }

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const [me, d] = await Promise.all([getMe(), adminGet<Data>(`/enquiries?page=${encodeURIComponent(sp.page ?? '1')}`)]);
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize));
  return (
    <>
      <h1>Enquiries from buyers</h1>
      <p className="lead">{isStaff(me.role) ? 'Every buyer who asked to be contacted about a listing. Listings without a seller account are yours to follow up.' : 'Buyers who asked to be contacted about your listings. They were shown your name and phone number, and you were emailed each time.'}</p>
      {d.items.length === 0 ? <p>No enquiries yet.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Listing</th><th>Buyer</th><th>Phone</th><th>Email</th><th>Message</th><th>When</th></tr></thead>
          <tbody>
            {d.items.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/admin/properties/${e.property.id}`}>{e.property.title}</Link></td>
                <td>{e.name}</td><td><a href={`tel:${e.phone}`}>{e.phone}</a></td><td>{e.email ? <a href={`mailto:${e.email}`}>{e.email}</a> : '—'}</td>
                <td className="awrap">{e.message ?? '—'}</td>
                <td>{new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {pages > 1 && <p className="apager">{d.page > 1 && <Link href={`/admin/enquiries?page=${d.page - 1}`}>← Newer</Link>} Page {d.page} of {pages} {d.page < pages && <Link href={`/admin/enquiries?page=${d.page + 1}`}>Older →</Link>}</p>}
    </>
  );
}

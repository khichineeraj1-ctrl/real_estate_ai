import Link from 'next/link';
import { adminGet, getMe, isStaff } from '@/lib/admin';

export const metadata = { title: 'Enquiries' };
interface Row {
  id: string; name: string; phone: string; email: string | null; message: string | null; interest: string | null; createdAt: string;
  property: { id: string; slug: string; title: string; state: string } | null; project: { id: string; slug: string; name: string } | null;
}
interface Data { items: Row[]; total: number; page: number; pageSize: number; project: { id: string; name: string; builder: string } | null }

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ page?: string; kind?: string; project?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === 'project' || sp.kind === 'listing' ? sp.kind : '';
  const query = new URLSearchParams({ ...(sp.project ? { project: sp.project } : kind ? { kind } : {}) });
  const [me, d] = await Promise.all([getMe(), adminGet<Data>(`/enquiries?${query}&page=${encodeURIComponent(sp.page ?? '1')}`)]);
  const staff = isStaff(me.role);
  const builder = me.role === 'BUILDER';
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize));
  const link = (p: number) => `/admin/enquiries?${new URLSearchParams({ ...Object.fromEntries(query), page: String(p) })}`;
  return (
    <>
      <div className="ahead">
        <h1>{d.project ? `Leads for ${d.project.name}` : builder ? 'Your leads' : 'Enquiries from buyers'}</h1>
        {(staff || builder) && d.total > 0 && <a className="abtn quiet" href={`/admin/enquiries/export?${query}`}>Download as a spreadsheet</a>}
      </div>
      <p className="lead">
        {d.project ? <>Buyers who asked about this {d.project.builder} project or one of its listings. <Link href="/admin/enquiries">See all {builder ? 'leads' : 'enquiries'}</Link>.</>
          : builder ? 'Buyers who asked for a call back about your projects or the homes you are selling in them. They agreed to be contacted by you.'
          : staff ? 'Every buyer who asked to be contacted. Leads on builder projects, and enquiries on listings without a seller account, are yours to follow up or pass to the builder.'
            : 'Buyers who asked to be contacted about your listings. They were shown your name and phone number, and you were emailed each time.'}
      </p>
      {staff && !d.project && (
        <p className="afilter">
          <Link href="/admin/enquiries" aria-current={kind ? undefined : 'page'}>All</Link>
          <Link href="/admin/enquiries?kind=project" aria-current={kind === 'project' ? 'page' : undefined}>Builder projects</Link>
          <Link href="/admin/enquiries?kind=listing" aria-current={kind === 'listing' ? 'page' : undefined}>Single listings</Link>
        </p>
      )}
      {d.items.length === 0 ? <p>{builder ? 'No leads yet.' : 'No enquiries yet.'}</p> : (
        <div className="atable"><table>
          <thead><tr><th>About</th><th>Buyer</th><th>Phone</th><th>Email</th><th>Interested in</th><th>Message</th><th>When</th></tr></thead>
          <tbody>
            {d.items.map((e) => (
              <tr key={e.id}>
                <td>
                  {builder ? (e.property?.title ?? e.project?.name) : e.property ? <Link href={`/admin/properties/${e.property.id}`}>{e.property.title}</Link> : e.project ? <Link href={`/admin/projects/${e.project.id}`}>{e.project.name}</Link> : 'A project that was since deleted'}
                  {e.property && e.project && staff && <><br /><small>in <Link href={`/admin/enquiries?project=${e.project.id}`}>{e.project.name}</Link></small></>}
                  {!e.property && e.project && <><br /><small>Project lead</small></>}
                </td>
                <td>{e.name}</td><td><a href={`tel:${e.phone}`}>{e.phone}</a></td><td>{e.email ? <a href={`mailto:${e.email}`}>{e.email}</a> : '—'}</td>
                <td>{e.interest ?? '—'}</td><td className="awrap">{e.message ?? '—'}</td>
                <td>{new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {pages > 1 && <p className="apager">{d.page > 1 && <Link href={link(d.page - 1)}>← Newer</Link>} Page {d.page} of {pages} {d.page < pages && <Link href={link(d.page + 1)}>Older →</Link>}</p>}
    </>
  );
}

import Link from 'next/link';
import { LeadStatus } from '@/components/admin/LeadStatus';
import { LEAD_STATUSES } from '@/lib/leads';
import { adminGet, getMe, isStaff } from '@/lib/admin';
import { updateEnquiry } from '../../actions';

export const metadata = { title: 'Enquiries' };
interface Row {
  id: string; name: string; phone: string; email: string | null; message: string | null; interest: string | null; status: string; note: string | null; createdAt: string;
  property: { id: string; slug: string; title: string; state: string } | null; project: { id: string; slug: string; name: string } | null;
}
interface Data { items: Row[]; total: number; page: number; pageSize: number; project: { id: string; name: string; builder: string } | null; byStatus: Record<string, number> }

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ page?: string; kind?: string; project?: string; status?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === 'project' || sp.kind === 'listing' ? sp.kind : '';
  const status = LEAD_STATUSES.find((s) => s.value === sp.status)?.value ?? '';
  // "scope" is which leads (a project, or a kind); the status filter narrows within it.
  const scope: Record<string, string> = sp.project ? { project: sp.project } : kind ? { kind } : {};
  const url = (extra: Record<string, string>) => { const q = new URLSearchParams({ ...scope, ...extra }).toString(); return `/admin/enquiries${q ? `?${q}` : ''}`; };
  const [me, d] = await Promise.all([getMe(), adminGet<Data>(`/enquiries?${new URLSearchParams({ ...scope, ...(status ? { status } : {}), page: sp.page ?? '1' })}`)]);
  const staff = isStaff(me.role);
  const builder = me.role === 'BUILDER';
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize));
  const everything = Object.values(d.byStatus).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="ahead">
        <h1>{d.project ? `Leads for ${d.project.name}` : builder ? 'Your leads' : 'Enquiries from buyers'}</h1>
        {(staff || builder) && everything > 0 && <a className="abtn quiet" href={`/admin/enquiries/export?${new URLSearchParams(scope)}`}>Download as a spreadsheet</a>}
      </div>
      <p className="lead">
        {d.project ? <>Buyers who asked about this {d.project.builder} project or one of its listings. <Link href="/admin/enquiries">See all {builder ? 'leads' : 'enquiries'}</Link>.</>
          : builder ? 'Buyers who asked for a call back about your projects or the homes you are selling in them. They agreed to be contacted by you.'
            : staff ? 'Every buyer who asked to be contacted. Leads on builder projects, and enquiries on listings without a seller account, are yours to follow up or pass to the builder.'
              : 'Buyers who asked to be contacted about your listings. They were shown your name and phone number, and you were emailed each time.'}
        {' '}Set a status as you follow up; notes are private and never shown to the buyer.
      </p>
      {staff && !d.project && (
        <p className="afilter">
          <Link href="/admin/enquiries" aria-current={kind ? undefined : 'page'}>All</Link>
          <Link href="/admin/enquiries?kind=project" aria-current={kind === 'project' ? 'page' : undefined}>Builder projects</Link>
          <Link href="/admin/enquiries?kind=listing" aria-current={kind === 'listing' ? 'page' : undefined}>Single listings</Link>
        </p>
      )}
      <p className="afilter" aria-label="Filter by status">
        <Link href={url({})} aria-current={status ? undefined : 'page'}>Any status ({everything})</Link>
        {LEAD_STATUSES.map((s) => <Link key={s.value} href={url({ status: s.value })} aria-current={status === s.value ? 'page' : undefined}>{s.label} ({d.byStatus[s.value] ?? 0})</Link>)}
      </p>
      {d.items.length === 0 ? <p>{status ? 'Nothing at this stage.' : builder ? 'No leads yet.' : 'No enquiries yet.'}</p> : (
        <div className="atable"><table>
          <thead><tr><th>About</th><th>Buyer</th><th>Contact</th><th>Wants</th><th>Status and note</th><th>Received</th></tr></thead>
          <tbody>
            {d.items.map((e) => (
              <tr key={e.id}>
                <td>
                  {builder ? (e.property?.title ?? e.project?.name) : e.property ? <Link href={`/admin/properties/${e.property.id}`}>{e.property.title}</Link> : e.project ? <Link href={`/admin/projects/${e.project.id}`}>{e.project.name}</Link> : 'A project that was since deleted'}
                  {e.property && e.project && staff && <><br /><small>in <Link href={`/admin/enquiries?project=${e.project.id}`}>{e.project.name}</Link></small></>}
                  {!e.property && e.project && <><br /><small>Project lead</small></>}
                </td>
                <td>{e.name}</td>
                <td><a href={`tel:${e.phone}`}>{e.phone}</a>{e.email && <><br /><a href={`mailto:${e.email}`}>{e.email}</a></>}</td>
                <td className="awrap">{e.interest}{e.interest && e.message ? ' · ' : ''}{e.message}{!e.interest && !e.message && '—'}</td>
                <td><LeadStatus key={e.id} action={updateEnquiry.bind(null, e.id)} status={e.status} note={e.note} who={e.name} /></td>
                <td>{new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {pages > 1 && <p className="apager">{d.page > 1 && <Link href={url({ ...(status ? { status } : {}), page: String(d.page - 1) })}>← Newer</Link>} Page {d.page} of {pages} {d.page < pages && <Link href={url({ ...(status ? { status } : {}), page: String(d.page + 1) })}>Older →</Link>}</p>}
    </>
  );
}

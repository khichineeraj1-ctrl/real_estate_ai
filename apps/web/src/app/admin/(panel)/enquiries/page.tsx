import Link from 'next/link';
import { LeadStatus } from '@/components/admin/LeadStatus';
import { BANDS, LEAD_STATUSES } from '@/lib/leads';
import { adminGet, getMe, isStaff } from '@/lib/admin';
import { updateEnquiry } from '../../actions';

export const metadata = { title: 'Enquiries' };
interface Event { id: string; party: 'STAFF' | 'PARTNER'; fromStatus: string; toStatus: string; note: string | null; byName: string; createdAt: string }
interface Row {
  id: string; name: string; phone: string; email: string | null; message: string | null; interest: string | null; status: string; note: string | null; createdAt: string;
  /** How strong the lead looks (0 to 100), its band, why, and what the buyer said about their plans. */
  score: number; band: 'HOT' | 'WARM' | 'COLD'; reasons: { points: number; text: string }[]; plans: string[];
  /** Staff only: how the seller or builder this lead belongs to is getting on. */
  /** True for a lead passed to this agent from a project they sell. */
  passedOn?: boolean;
  partner: { kind: 'Agent' | 'Seller' | 'Builder'; name: string; status: string; note: string | null; at: string | null } | null;
  events: Event[];
  property: { id: string; slug: string; title: string; state: string } | null; project: { id: string; slug: string; name: string } | null;
}
interface Data { items: Row[]; total: number; page: number; pageSize: number; project: { id: string; name: string; builder: string } | null; byStatus: Record<string, number>; byBand: Record<string, number> }

const label = (status: string) => LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ page?: string; kind?: string; project?: string; status?: string; band?: string; sort?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === 'project' || sp.kind === 'listing' ? sp.kind : '';
  const status = LEAD_STATUSES.find((s) => s.value === sp.status)?.value ?? '';
  // "scope" is which leads (a project, or a kind); the status filter narrows within it.
  const scope: Record<string, string> = sp.project ? { project: sp.project } : kind ? { kind } : {};
  const band = BANDS.find((b) => b.value === sp.band)?.value ?? '';
  const newest = sp.sort === 'newest';
  const keep = { ...(band ? { band } : {}), ...(newest ? { sort: 'newest' } : {}) };
  const url = (extra: Record<string, string>) => { const q = new URLSearchParams({ ...scope, ...extra }).toString(); return `/admin/enquiries${q ? `?${q}` : ''}`; };
  const [me, d] = await Promise.all([getMe(), adminGet<Data>(`/enquiries?${new URLSearchParams({ ...scope, ...keep, ...(status ? { status } : {}), page: sp.page ?? '1' })}`)]);
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
              : 'Buyers who asked to be contacted about your listings, and buyers passed to you from projects you sell. They were shown your name and phone number, and you were emailed each time.'}
        {' '}Set a status as you follow up; notes are private and never shown to the buyer.
        {staff ? ' Your team’s status is separate from the seller’s or builder’s, which is shown beneath it.' : ''}
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
      <p className="afilter" aria-label="Filter by lead strength">
        <Link href={url({ ...(status ? { status } : {}), ...(newest ? { sort: 'newest' } : {}) })} aria-current={band ? undefined : 'page'}>Any strength</Link>
        {BANDS.map((b) => <Link key={b.value} href={url({ ...(status ? { status } : {}), ...(newest ? { sort: 'newest' } : {}), band: b.value })} aria-current={band === b.value ? 'page' : undefined}>{b.label} ({d.byBand[b.value] ?? 0})</Link>)}
        <span aria-hidden="true"> · </span>
        <Link href={url({ ...(status ? { status } : {}), ...(band ? { band } : {}) })} aria-current={newest ? undefined : 'page'}>Strongest first</Link>
        <Link href={url({ ...(status ? { status } : {}), ...(band ? { band } : {}), sort: 'newest' })} aria-current={newest ? 'page' : undefined}>Newest first</Link>
      </p>
      <p className="calc-note">Lead strength is worked out from what the buyer said about their plans, how they used the site before enquiring, and how they got in touch. Hot: call today. Warm: worth a call this week. Cold: little sign of intent yet. Open “Why” on any lead to see what counted.</p>
      {d.items.length === 0 ? <p>{status || band ? 'Nothing matches these filters.' : builder ? 'No leads yet.' : 'No enquiries yet.'}</p> : (
        <div className="atable"><table>
          <thead><tr><th>Strength</th><th>About</th><th>Buyer</th><th>Contact</th><th>Wants</th><th>Status and note</th><th>Received</th></tr></thead>
          <tbody>
            {d.items.map((e) => (
              <tr key={e.id}>
                <td>
                  <span className={`band band-${e.band}`}>{BANDS.find((b) => b.value === e.band)?.label ?? e.band} · {e.score}</span>
                  {e.reasons.length > 0 && (
                    <details className="ascore">
                      <summary>Why</summary>
                      <ul>{e.reasons.map((r) => <li key={r.text}>{r.points > 0 ? `+${r.points}` : r.points} {r.text}</li>)}</ul>
                    </details>
                  )}
                </td>
                <td>
                  {builder ? (e.property?.title ?? e.project?.name) : e.property ? <Link href={`/admin/properties/${e.property.id}`}>{e.property.title}</Link> : e.project ? <Link href={`/admin/projects/${e.project.id}`}>{e.project.name}</Link> : 'A project that was since deleted'}
                  {e.property && e.project && staff && <><br /><small>in <Link href={`/admin/enquiries?project=${e.project.id}`}>{e.project.name}</Link></small></>}
                  {!e.property && e.project && <><br /><small>{e.passedOn && !staff ? 'Passed to you as a verified agent' : e.passedOn ? 'Project lead, passed to an agent' : 'Project lead'}</small></>}
                </td>
                <td>{e.name}</td>
                <td><a href={`tel:${e.phone}`}>{e.phone}</a>{e.email && <><br /><a href={`mailto:${e.email}`}>{e.email}</a></>}</td>
                <td className="awrap">{[e.interest, ...e.plans].filter(Boolean).join(' · ')}{(e.interest || e.plans.length > 0) && e.message ? <br /> : null}{e.message}{!e.interest && !e.message && e.plans.length === 0 && '—'}</td>
                <td>
                  <LeadStatus key={e.id} action={updateEnquiry.bind(null, e.id)} status={e.status} note={e.note} who={e.name} />
                  {e.partner && (
                    <p className="apartner"><strong>{e.partner.kind}</strong> ({e.partner.name}): {label(e.partner.status)}{e.partner.note ? ` — ${e.partner.note}` : ''}</p>
                  )}
                  {e.events.length > 0 && (
                    <details className="ahistory">
                      <summary>History ({e.events.length})</summary>
                      <ol>
                        {e.events.map((ev) => (
                          <li key={ev.id}>
                            {when(ev.createdAt)} · {ev.byName}{staff ? ` (${ev.party === 'STAFF' ? 'our team' : 'seller or builder'})` : ''}:{' '}
                            {ev.fromStatus === ev.toStatus ? `note changed, still ${label(ev.toStatus)}` : `${label(ev.fromStatus)} → ${label(ev.toStatus)}`}{ev.note ? ` — “${ev.note}”` : ''}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </td>
                <td>{when(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {pages > 1 && <p className="apager">{d.page > 1 && <Link href={url({ ...keep, ...(status ? { status } : {}), page: String(d.page - 1) })}>← Newer</Link>} Page {d.page} of {pages} {d.page < pages && <Link href={url({ ...keep, ...(status ? { status } : {}), page: String(d.page + 1) })}>Older →</Link>}</p>}
    </>
  );
}

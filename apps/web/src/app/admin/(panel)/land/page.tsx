import Link from 'next/link';
import { ActionButton, AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { price } from '@/lib/format';
import { decideLand, landReplyDone } from '../../actions';

export const metadata = { title: 'Land' };

interface Poster { posterIs?: string; posterName: string; posterPhone: string; posterEmail: string | null }
interface Listing extends Poster { id: string; slug: string; kind: string; deal: string; title: string; description: string | null; state: string; district: string; place: string; area: string; rate: string | null; priceInr: number | null; roadFt: number | null; highway: string | null; highwayKm: number | null; landUse: string | null; features: string[]; status: string; decisionNote: string | null; createdAt: string }
interface Wanted extends Poster { id: string; slug: string; kind: string; deal: string; purpose: string; title: string; details: string | null; state: string; where: string | null; areaMin: number; areaMax: number | null; areaUnit: string; budgetInr: number | null; company: string | null; showCompany: boolean; status: string; createdAt: string }
interface Reply { id: string; name: string; phone: string; message: string | null; createdAt: string; listing: { slug: string; title: string; posterName: string; posterPhone: string } | null; wanted: { slug: string; title: string; posterName: string; posterPhone: string; company: string | null } | null }
const TABS = [['PENDING', 'Waiting'], ['LIVE', 'Live'], ['REJECTED', 'Turned down'], ['CLOSED', 'Closed']] as const;
const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const who = (p: Poster) => <>{p.posterName}<br /><small>{p.posterIs ? `${p.posterIs.toLowerCase()} · ` : ''}<a href={`tel:${p.posterPhone}`}>{p.posterPhone}</a>{p.posterEmail ? ` · ${p.posterEmail}` : ''}</small></>;

export default async function Land({ searchParams }: { searchParams: Promise<{ status?: string; tab?: string; saved?: string }> }) {
  const sp = await searchParams;
  const status = TABS.find(([v]) => v === sp.status)?.[0] ?? 'PENDING';
  const replies = sp.tab === 'replies';
  const [waiting, queue, rows] = await Promise.all([
    adminGet<{ listings: number; wanted: number; replies: number }>('/land/waiting'),
    replies ? Promise.resolve({ listings: [] as Listing[], wanted: [] as Wanted[] }) : adminGet<{ listings: Listing[]; wanted: Wanted[] }>(`/land?status=${status}`),
    replies ? adminGet<Reply[]>('/land/replies') : Promise.resolve([] as Reply[]),
  ]);
  const decide = (type: 'listing' | 'wanted', id: string, st: string, district?: string) => (
    <>
      {st !== 'LIVE' && <AdminForm action={decideLand.bind(null, type, id, 'LIVE')} submit="Approve" pendingLabel="Saving…">{district != null ? <Field label="District (correct the spelling if needed)" name="district" defaultValue={district} maxLength={60} /> : <input type="hidden" name="note" value="" />}</AdminForm>}
      {st !== 'REJECTED' && <AdminForm action={decideLand.bind(null, type, id, 'REJECTED')} submit={st === 'LIVE' ? 'Take down' : 'Turn down'} pendingLabel="Saving…"><Field label="Reason, shown to the poster" name="note" required={false} maxLength={300} /></AdminForm>}
    </>
  );
  return (
    <>
      <div className="ahead"><h1>Land and commercial space</h1></div>
      <p className="lead">Listings and requirements posted without an account. Nothing shows until approved. Posters’ numbers are never public: enquiries and answers land here for you to introduce the two sides by phone.</p>
      {sp.saved && <p role="status" className="astatus">Saved.</p>}
      <p className="afilter">
        {TABS.map(([v, label]) => <Link key={v} href={`/admin/land?status=${v}`} aria-current={!replies && status === v ? 'page' : undefined}>{label}{v === 'PENDING' && waiting.listings + waiting.wanted ? ` (${waiting.listings + waiting.wanted})` : ''}</Link>)}
        <Link href="/admin/land?tab=replies" aria-current={replies ? 'page' : undefined}>Enquiries and answers{waiting.replies ? ` (${waiting.replies})` : ''}</Link>
      </p>

      {replies ? (rows.length === 0 ? <p>Nothing waiting.</p> : (
        <div className="atable"><table>
          <thead><tr><th>From</th><th>About</th><th>Introduce to</th><th><span className="sr">Done</span></th></tr></thead>
          <tbody>{rows.map((r) => { const t = r.listing ?? r.wanted; return (
            <tr key={r.id}>
              <td>{r.name}<br /><small><a href={`tel:${r.phone}`}>{r.phone}</a> · {when(r.createdAt)}</small>{r.message ? <><br /><small className="awrap">{r.message}</small></> : null}</td>
              <td className="awrap">{r.listing ? 'Enquiry on listing' : 'Answer to requirement'}<br />{t ? <Link href={r.listing ? `/land/listing/${t.slug}` : `/land/wanted/${t.slug}`}>{t.title}</Link> : '—'}</td>
              <td>{t ? <>{t.posterName}{r.wanted?.company ? `, ${r.wanted.company}` : ''}<br /><small><a href={`tel:${t.posterPhone}`}>{t.posterPhone}</a></small></> : '—'}</td>
              <td><ActionButton action={landReplyDone.bind(null, r.id)} label="Mark done" /></td>
            </tr>); })}</tbody>
        </table></div>
      )) : (
        <>
          <h2>Listings</h2>
          {queue.listings.length === 0 ? <p>Nothing here.</p> : (
            <div className="atable"><table>
              <thead><tr><th>Listing</th><th>Details</th><th>Posted by</th><th>Decide</th></tr></thead>
              <tbody>{queue.listings.map((l) => (
                <tr key={l.id}>
                  <td className="awrap">{l.status === 'LIVE' ? <Link href={`/land/listing/${l.slug}`}>{l.title}</Link> : l.title}<br /><small>{l.place}, {l.district}, {l.state} · {when(l.createdAt)}</small></td>
                  <td className="awrap">{l.area} · {l.priceInr ? price(l.priceInr) : 'no price'}{l.rate ? ` (${l.rate})` : ''}<br /><small>{[l.roadFt ? `${l.roadFt} ft road` : null, l.highway ? `${l.highway}${l.highwayKm != null ? ` ${l.highwayKm} km` : ''}` : null, l.landUse?.toLowerCase(), ...l.features].filter(Boolean).join(' · ') || '—'}</small>{l.description ? <><br /><small>{l.description}</small></> : null}</td>
                  <td>{who(l)}</td>
                  <td>{l.status === 'CLOSED' ? 'Closed by the poster' : decide('listing', l.id, l.status, l.district)}{l.decisionNote ? <small>{l.decisionNote}</small> : null}</td>
                </tr>))}</tbody>
            </table></div>
          )}
          <h2>Requirements</h2>
          {queue.wanted.length === 0 ? <p>Nothing here.</p> : (
            <div className="atable"><table>
              <thead><tr><th>Requirement</th><th>Details</th><th>Posted by</th><th>Decide</th></tr></thead>
              <tbody>{queue.wanted.map((w) => (
                <tr key={w.id}>
                  <td className="awrap">{w.status === 'LIVE' ? <Link href={`/land/wanted/${w.slug}`}>{w.title}</Link> : w.title}<br /><small>{when(w.createdAt)}</small></td>
                  <td className="awrap">{w.areaMin}{w.areaMax ? `–${w.areaMax}` : '+'} {w.areaUnit}{w.budgetInr ? ` · up to ${price(w.budgetInr)}` : ''}{w.details ? <><br /><small>{w.details}</small></> : null}</td>
                  <td>{who(w)}{w.company ? <><br /><small>{w.company} ({w.showCompany ? 'name shown' : 'name hidden'})</small></> : null}</td>
                  <td>{w.status === 'CLOSED' ? 'Closed by the poster' : decide('wanted', w.id, w.status)}</td>
                </tr>))}</tbody>
            </table></div>
          )}
        </>
      )}
    </>
  );
}

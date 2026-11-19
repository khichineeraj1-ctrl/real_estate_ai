import Link from 'next/link';
import { ActionButton } from '@/components/admin/Form';
import { adminGet } from '@/lib/admin';
import { investDone } from '../../actions';

export const metadata = { title: 'Investor corner' };
interface Row { id: string; slug: string; title: string; state: string; stage: string; status: string; reviewedAt: string | null; updatedAt: string; _count: { interests: number } }
interface Interest { id: string; name: string; phone: string; email: string | null; note: string | null; budgetLabel: string | null; wantsLabel: string | null; horizonLabel: string | null; createdAt: string; area: { slug: string; title: string } | null }
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');
const STALE = 90 * 86_400_000;

export default async function Invest({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string; removed?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === 'interests';
  const [waiting, rows, people] = await Promise.all([adminGet<{ interests: number }>('/invest/waiting'), tab ? Promise.resolve([] as Row[]) : adminGet<Row[]>('/invest'), tab ? adminGet<Interest[]>('/invest/interests') : Promise.resolve([] as Interest[])]);
  return (
    <>
      <div className="ahead"><h1>Investor corner</h1><Link className="abtn" href="/admin/invest/new">Add an area</Link></div>
      <p className="lead">Areas where a government plan is changing what land is for. Write only what the official documents say and link them. Never predict prices or returns: text that does is refused. People who show interest appear under “Interested people” for you to call.</p>
      {sp.saved && <p role="status" className="astatus">Saved.</p>}
      {sp.removed && <p role="status" className="astatus">Removed.</p>}
      <p className="afilter"><Link href="/admin/invest" aria-current={!tab ? 'page' : undefined}>Areas</Link><Link href="/admin/invest?tab=interests" aria-current={tab ? 'page' : undefined}>Interested people{waiting.interests ? ` (${waiting.interests})` : ''}</Link></p>
      {tab ? (people.length === 0 ? <p>Nobody waiting.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Who</th><th>Interested in</th><th>What they said</th><th><span className="sr">Done</span></th></tr></thead>
          <tbody>{people.map((p) => (
            <tr key={p.id}>
              <td>{p.name}<br /><small><a href={`tel:${p.phone}`}>{p.phone}</a>{p.email ? ` · ${p.email}` : ''} · {when(p.createdAt)}</small></td>
              <td className="awrap">{p.area ? <Link href={`/invest/${p.area.slug}`}>{p.area.title}</Link> : 'In general'}</td>
              <td className="awrap">{[p.budgetLabel, p.wantsLabel, p.horizonLabel].filter(Boolean).join(' · ') || '—'}{p.note ? <><br /><small>{p.note}</small></> : null}</td>
              <td><ActionButton action={investDone.bind(null, p.id)} label="Mark called" /></td>
            </tr>))}</tbody>
        </table></div>
      )) : rows.length === 0 ? <p>No areas yet. Add the first.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Area</th><th>Stage</th><th>Status</th><th>Facts last checked</th><th>Interested</th></tr></thead>
          <tbody>{rows.map((r) => { const stale = r.status === 'LIVE' && (!r.reviewedAt || Date.now() - new Date(r.reviewedAt).getTime() > STALE); return (
            <tr key={r.id}>
              <td><Link href={`/admin/invest/${r.id}`}>{r.title}</Link><br /><small>{r.state}</small></td>
              <td>{r.stage.charAt(0) + r.stage.slice(1).toLowerCase()}</td>
              <td>{r.status === 'LIVE' ? <Link href={`/invest/${r.slug}`}>Live ↗</Link> : 'Draft'}</td>
              <td>{when(r.reviewedAt)}{stale ? <><br /><small className="aerror-text">Over 90 days: check again</small></> : null}</td>
              <td>{r._count.interests}</td>
            </tr>); })}</tbody>
        </table></div>
      )}
    </>
  );
}

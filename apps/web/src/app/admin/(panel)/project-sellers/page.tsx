import Link from 'next/link';
import { AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { adminGet, requireStaff } from '@/lib/admin';
import { decideProjectSeller } from '../../actions';

export const metadata = { title: 'Agents on projects' };

interface Row {
  id: string; status: 'REQUESTED' | 'APPROVED' | 'REJECTED'; note: string | null; decisionNote: string | null; createdAt: string; decidedAt: string | null; decidedBy: string | null;
  project: { id: string; slug: string; name: string; builder: string; locality: { name: string; city: { name: string } } };
  user: { id: string; name: string; phone: string | null; email: string; active: boolean; dealer: { firmName: string | null; reraNumber: string | null; status: string; level: number; kind: string } | null };
}
const TABS = [['REQUESTED', 'Waiting'], ['APPROVED', 'Approved'], ['REJECTED', 'Turned down']] as const;
const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function ProjectSellers({ searchParams }: { searchParams: Promise<{ status?: string; decided?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const status = TABS.find(([v]) => v === sp.status)?.[0] ?? 'REQUESTED';
  const rows = await adminGet<Row[]>(`/project-sellers?status=${status}`);
  return (
    <>
      <div className="ahead"><h1>Agents on projects</h1></div>
      <p className="lead">Verified agents ask here to be offered to buyers for a builder’s project. Approve a request only when you are satisfied the agent really sells that project, for example from the builder’s channel-partner letter. An approved agent appears on the project as “verified”, and buyers who ask to be connected are passed to them.</p>
      {sp.decided && <p role="status" className="astatus">Saved.</p>}
      <p className="afilter">{TABS.map(([v, label]) => <Link key={v} href={`/admin/project-sellers?status=${v}`} aria-current={status === v ? 'page' : undefined}>{label}</Link>)}</p>
      {rows.length === 0 ? <p>Nothing here.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Agent</th><th>Project</th><th>What they said</th><th>{status === 'REQUESTED' ? 'Decide' : 'Decision'}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/dealers/${r.user.id}`}>{r.user.name}</Link>{r.user.dealer?.firmName ? <><br /><small>{r.user.dealer.firmName}</small></> : null}
                  <br /><small>{r.user.dealer?.status === 'APPROVED' ? `Verified, level ${r.user.dealer.level}` : 'Not verified yet'}{r.user.dealer?.reraNumber ? ` · RERA ${r.user.dealer.reraNumber}` : ''}</small>
                  <br /><small>{r.user.phone} · {r.user.email}</small>
                </td>
                <td><Link href={`/projects/${r.project.slug}`}>{r.project.name}</Link><br /><small>{r.project.builder} · {r.project.locality.name}, {r.project.locality.city.name}</small></td>
                <td className="awrap">{r.note ?? '—'}<br /><small>Asked on {when(r.createdAt)}</small></td>
                <td>
                  {status === 'REQUESTED' ? (
                    <>
                      <AdminForm action={decideProjectSeller.bind(null, r.id, 'APPROVED')} submit="Approve" pendingLabel="Saving…"><input type="hidden" name="note" value="" /></AdminForm>
                      <AdminForm action={decideProjectSeller.bind(null, r.id, 'REJECTED')} submit="Turn down" pendingLabel="Saving…"><Field label="Reason, shown to the agent" name="note" required={false} maxLength={300} /></AdminForm>
                    </>
                  ) : (
                    <>
                      {r.decidedBy} · {r.decidedAt ? when(r.decidedAt) : ''}{r.decisionNote ? <><br /><small>{r.decisionNote}</small></> : null}
                      <AdminForm action={decideProjectSeller.bind(null, r.id, status === 'APPROVED' ? 'REJECTED' : 'APPROVED')} submit={status === 'APPROVED' ? 'Withdraw approval' : 'Approve after all'} pendingLabel="Saving…"><input type="hidden" name="note" value="" /></AdminForm>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );
}

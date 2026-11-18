import Link from 'next/link';
import { ConfidenceBadge } from '@/components/Confidence';
import { adminGet } from '@/lib/admin';
import { KIND_LABEL } from '@/lib/trust';

export const metadata = { title: 'Sellers' };
const STATUS: Record<string, string> = { SUBMITTED: 'Waiting for review', NEEDS_INFO: 'Asked for more', APPROVED: 'Verified', REJECTED: 'Turned down', DRAFT: 'Not sent yet' };
interface Row { userId: string; kind: string; firmName: string | null; status: string; submittedAt: string | null; level: number; complaints: number; user: { name: string; email: string; active: boolean; _count: { properties: number } }; _count: { documents: number } }

export default async function Dealers({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? '';
  const d = await adminGet<{ items: Row[]; waiting: number }>(`/dealers?status=${encodeURIComponent(status)}`);
  const tab = (value: string, label: string) => <Link href={value ? `/admin/dealers?status=${value}` : '/admin/dealers'} aria-current={status === value ? 'page' : undefined}>{label}</Link>;
  return (
    <>
      <h1>Sellers to verify</h1>
      <p className="lead">Owners, agents and builders who have asked to be verified. Open one to see their answers and documents, record what you checked, and decide. Only what you tick counts towards the confidence buyers see.</p>
      <p className="afilter">{tab('', 'All sent')}{tab('SUBMITTED', `Waiting for review (${d.waiting})`)}{tab('NEEDS_INFO', 'Asked for more')}{tab('APPROVED', 'Verified')}{tab('REJECTED', 'Turned down')}</p>
      {d.items.length === 0 ? <p>Nobody here.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Seller</th><th>Kind</th><th>Status</th><th>Confidence</th><th>Documents</th><th>Listings</th><th>Sent</th></tr></thead>
          <tbody>
            {d.items.map((r) => (
              <tr key={r.userId}>
                <td><Link href={`/admin/dealers/${r.userId}`}>{r.firmName ?? r.user.name}</Link><br /><small>{r.user.name} · {r.user.email}{r.user.active ? '' : ' · account deactivated'}</small></td>
                <td>{KIND_LABEL[r.kind]}</td><td>{STATUS[r.status]}</td><td><ConfidenceBadge level={r.level} /></td><td>{r._count.documents}</td><td>{r.user._count.properties}</td>
                <td>{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );
}

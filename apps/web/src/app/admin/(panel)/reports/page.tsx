import Link from 'next/link';
import { DecideReport } from '@/components/admin/DecideReport';
import { adminGet } from '@/lib/admin';
import { reasonLabel } from '@/lib/trust';
import { decideReport } from '../../actions';

export const metadata = { title: 'Reports' };
interface Row {
  id: string; reason: string; details: string; reporterName: string; reporterPhone: string; status: 'NEW' | 'UPHELD' | 'DISMISSED'; staffNote: string | null; buyerNote: string | null; reporterEmail: string | null; decidedAt: string | null; decidedBy: string | null; createdAt: string;
  listingTitle: string; property: { id: string; slug: string; state: string } | null; seller: { id: string; name: string; email: string; phone: string | null } | null;
}
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const STATUS = { NEW: 'To look into', UPHELD: 'Upheld', DISMISSED: 'Dismissed' };

export default async function Reports({ searchParams }: { searchParams: Promise<{ status?: string; decided?: string }> }) {
  const sp = await searchParams;
  const status = sp.status ?? '';
  const d = await adminGet<{ items: Row[]; waiting: number }>(`/reports?status=${encodeURIComponent(status)}`);
  const tab = (value: string, label: string) => <Link href={value ? `/admin/reports?status=${value}` : '/admin/reports'} aria-current={status === value ? 'page' : undefined}>{label}</Link>;
  return (
    <>
      <h1>Reports from buyers</h1>
      <p className="lead">A report is one person’s account, and anyone can send one, so it changes nothing until you have looked into it. Speak to the buyer and the seller, then uphold or dismiss. An upheld report holds the seller at “Basic checks only” for every buyer.</p>
      {sp.decided && <p role="status" className="anotice">Decision saved. The seller’s confidence level and their listings’ order are updated.</p>}
      <p className="afilter">{tab('', 'All')}{tab('NEW', `To look into (${d.waiting})`)}{tab('UPHELD', 'Upheld')}{tab('DISMISSED', 'Dismissed')}</p>
      {d.items.length === 0 ? <p>No reports here.</p> : d.items.map((r) => (
        <article key={r.id} className="areport">
          <h2>{reasonLabel(r.reason)} <span className={`tag ${r.status === 'UPHELD' ? '' : r.status === 'DISMISSED' ? 'tag-ready' : ''}`}>{STATUS[r.status]}</span></h2>
          <p className="awrap">“{r.details}”</p>
          <dl className="detail">
            <div><dt>Listing</dt><dd>{r.property ? <Link href={`/admin/properties/${r.property.id}`}>{r.listingTitle}</Link> : `${r.listingTitle} (deleted)`}{r.property && r.property.state !== 'PUBLISHED' ? ' — off the site' : ''}</dd></div>
            <div><dt>Seller</dt><dd>{r.seller ? <><Link href={`/admin/dealers/${r.seller.id}`}>{r.seller.name}</Link>{r.seller.phone ? <>, <a href={`tel:${r.seller.phone}`}>{r.seller.phone}</a></> : ''}</> : 'Listed by our team'}</dd></div>
            <div><dt>Reported by</dt><dd>{r.reporterName}, <a href={`tel:${r.reporterPhone}`}>{r.reporterPhone}</a>{r.reporterEmail ? <>, <a href={`mailto:${r.reporterEmail}`}>{r.reporterEmail}</a></> : ''}</dd></div>
            <div><dt>Received</dt><dd>{when(r.createdAt)}</dd></div>
            {r.decidedAt && <div><dt>Decided</dt><dd>{when(r.decidedAt)} by {r.decidedBy}</dd></div>}
          </dl>
          <DecideReport action={decideReport.bind(null, r.id)} note={r.staffNote} buyerNote={r.buyerNote} hasEmail={!!r.reporterEmail} decided={r.status !== 'NEW'} canTakeDown={r.property?.state === 'PUBLISHED'} />
        </article>
      ))}
    </>
  );
}

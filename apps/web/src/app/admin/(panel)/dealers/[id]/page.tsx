import Link from 'next/link';
import { ConfidenceBadge, ConfidenceReasons } from '@/components/Confidence';
import { ActionButton } from '@/components/admin/Form';
import { ReviewForm } from '@/components/admin/ReviewForm';
import { adminGet } from '@/lib/admin';
import { DOC_LABEL, KIND_LABEL, type Confidence } from '@/lib/trust';
import { purgeDocuments, reviewDealer } from '../../../actions';

interface Doc { id: string; kind: string; mime: string; sizeBytes: number; createdAt: string }
interface Data {
  profile: {
    userId: string; kind: string; firmName: string | null; yearsInBusiness: number | null; officeAddress: string | null; cities: string[]; reraNumber: string | null; gstNumber: string | null; website: string | null;
    ownerRelation: string | null; about: string | null; status: string; submittedAt: string | null; reviewedAt: string | null; reviewedBy: string | null; reviewNote: string | null; internalNote: string | null;
    checkIdentity: boolean; checkRera: boolean; checkPhone: boolean; checkAddress: boolean; complaints: number;
    user: { name: string; email: string; phone: string | null; active: boolean; createdAt: string; emailVerified: string | null }; documents: Doc[];
  };
  facts: { oldLeads: number; oldLeadsFollowedUp: number; listings: number; listingsRejected: number } | null;
  confidence: Confidence; retentionDays: number;
}
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function DealerReview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; purged?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const d = await adminGet<Data>(`/dealers/${encodeURIComponent(id)}`);
  const p = d.profile;
  const row = (label: string, value: React.ReactNode) => <div><dt>{label}</dt><dd>{value || '—'}</dd></div>;
  return (
    <>
      <p><Link href="/admin/dealers">← Sellers</Link></p>
      <h1>{p.firmName ?? p.user.name} <ConfidenceBadge level={d.confidence.level} /></h1>
      {sp.done && <p role="status" className="anotice">Saved. The seller has been emailed and their listings re-ranked.</p>}
      {sp.purged && <p role="status" className="anotice">Documents deleted. The record of what was verified is kept.</p>}
      <p className="lead">{KIND_LABEL[p.kind]} · sent {p.submittedAt ? day(p.submittedAt) : '—'}{p.reviewedAt ? ` · last reviewed ${day(p.reviewedAt)} by ${p.reviewedBy}` : ''}</p>

      <h2>What they told us</h2>
      <dl className="detail">
        {row('Name on account', p.user.name)}{row('Email', <>{p.user.email}{p.user.emailVerified ? ' (confirmed)' : ' (not confirmed)'}</>)}{row('Phone', p.user.phone && <a href={`tel:${p.user.phone}`}>{p.user.phone}</a>)}
        {row('Firm', p.firmName)}{row('RERA number', p.reraNumber)}{row('GST number', p.gstNumber)}{row('Connection to property', p.ownerRelation)}{row('Years in business', p.yearsInBusiness)}
        {row('Website', p.website && <a href={p.website} target="_blank" rel="noopener noreferrer nofollow">{p.website}</a>)}{row('Address', p.officeAddress)}{row('Works in', p.cities.join(', '))}{row('Joined', day(p.user.createdAt))}
      </dl>
      {p.about && <p><strong>About, for buyers:</strong> {p.about}</p>}

      <h2 className="section">Documents</h2>
      {p.documents.length === 0 ? <p>None on file{p.reviewedAt ? ' (deleted after review, or never added)' : ''}.</p> : (
        <>
          <ul className="bullets">{p.documents.map((doc) => <li key={doc.id}><a href={`/admin/documents/${doc.id}`} target="_blank" rel="noopener">{DOC_LABEL[doc.kind] ?? doc.kind}</a> <small>({doc.mime === 'application/pdf' ? 'PDF' : 'image'}, {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB, added {day(doc.createdAt)})</small></li>)}</ul>
          <p className="calc-note">These are identity papers: open them only to verify this seller. Each opening is logged. They are deleted automatically {d.retentionDays} days after the review.</p>
          <ActionButton action={purgeDocuments.bind(null, p.userId)} label="Delete these documents now" confirm="Delete this seller’s documents? What you verified is kept; the papers are not." tone="danger" />
        </>
      )}

      {d.facts && (
        <>
          <h2 className="section">How they have behaved here</h2>
          <p>{d.facts.listings} {d.facts.listings === 1 ? 'listing' : 'listings'}, {d.facts.listingsRejected} turned down. {d.facts.oldLeads === 0 ? 'No buyer enquiries older than two days yet.' : `Followed up ${d.facts.oldLeadsFollowedUp} of ${d.facts.oldLeads} buyer enquiries older than two days.`}</p>
        </>
      )}

      <section className="areview section">
        <h2>Your review</h2>
        <ReviewForm action={reviewDealer.bind(null, p.userId)} owner={p.kind === 'OWNER'} approved={p.status === 'APPROVED'} checks={{ checkIdentity: p.checkIdentity, checkRera: p.checkRera, checkPhone: p.checkPhone, checkAddress: p.checkAddress }} reviewNote={p.reviewNote} internalNote={p.internalNote} complaints={p.complaints} />
      </section>

      <section className="section trust">
        <h2>What buyers see now</h2>
        <ConfidenceReasons confidence={d.confidence} />
        <p><Link href={`/dealers/${p.userId}`}>Open their public seller page</Link></p>
      </section>
    </>
  );
}

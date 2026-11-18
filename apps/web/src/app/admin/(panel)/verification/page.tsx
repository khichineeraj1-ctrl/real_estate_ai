import { redirect } from 'next/navigation';
import { ConfidenceBadge, ConfidenceReasons } from '@/components/Confidence';
import { ActionButton, AdminForm } from '@/components/admin/Form';
import { Area, Field, Select } from '@/components/admin/fields';
import { adminGet, getMe } from '@/lib/admin';
import { DOC_LABEL, type Confidence } from '@/lib/trust';
import { removeDocument, saveDealerProfile, submitDealerProfile } from '../../actions';

export const metadata = { title: 'Get verified' };

interface Doc { id: string; kind: string; mime: string; sizeBytes: number; createdAt: string }
interface Profile {
  kind: string; firmName: string | null; yearsInBusiness: number | null; officeAddress: string | null; cities: string[]; reraNumber: string | null; gstNumber: string | null; website: string | null;
  ownerRelation: string | null; about: string | null; status: 'DRAFT' | 'SUBMITTED' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED'; reviewNote: string | null; documents: Doc[];
}
interface Data { profile: Profile | null; confidence: Confidence; retentionDays: number }

export default async function Verification({ searchParams }: { searchParams: Promise<{ uploaded?: string; error?: string; saved?: string; removed?: string }> }) {
  const [me, sp] = await Promise.all([getMe(), searchParams]);
  if (me.role !== 'AGENT') redirect('/admin');
  const d = await adminGet<Data>('/dealer/profile');
  const p = d.profile;
  const locked = p?.status === 'SUBMITTED';
  return (
    <>
      <h1>Get verified <ConfidenceBadge level={d.confidence.level} /></h1>
      <p className="lead">Buyers are putting their savings into a home, so we show them how far we have verified each seller, and we show verified sellers’ homes first. Tell us who you are, add the documents, and our team will check them.</p>

      {sp.saved && <p role="status" className="anotice">Saved.</p>}
      {sp.uploaded && <p role="status" className="anotice">Document added.</p>}
      {sp.removed && <p role="status" className="anotice">Document deleted.</p>}
      {sp.error && <p role="alert" className="aerror">{sp.error}</p>}

      <div className="astatus">
        {!p && <p><strong>Not started.</strong> Fill in your details below to begin.</p>}
        {p?.status === 'DRAFT' && <p><strong>Not sent yet.</strong> Save your details, add your documents, then send them for review at the bottom of this page.</p>}
        {p?.status === 'SUBMITTED' && <p><strong>With our team.</strong> We are checking your details and will email you. They cannot be changed until we reply.</p>}
        {p?.status === 'NEEDS_INFO' && <p><strong>We need a little more:</strong> {p.reviewNote} Update below and send again.</p>}
        {p?.status === 'REJECTED' && <p><strong>We could not verify you:</strong> {p.reviewNote} You can correct your details and send them again.</p>}
        {p?.status === 'APPROVED' && <p><strong>You are verified.</strong> This is what buyers see about you. Changing your details below sends them back to our team for another check.</p>}
        <ConfidenceReasons confidence={d.confidence} />
      </div>

      <h2>1. About you</h2>
      {locked ? <p>Your answers are with our team.</p> : (
        <AdminForm action={saveDealerProfile} submit="Save details">
          <Select label="You are" name="kind" defaultValue={p?.kind} options={[{ value: 'OWNER', label: 'An owner selling my own property' }, { value: 'AGENT', label: 'An agent or broker' }, { value: 'BUILDER', label: 'A builder’s sales office' }]} />
          <Field label="Firm or company name" name="firmName" required={false} defaultValue={p?.firmName} maxLength={120} hint="Needed for builders; agents if you have one." />
          <Field label="RERA registration number" name="reraNumber" required={false} defaultValue={p?.reraNumber} maxLength={80} hint="Needed for agents. We look it up on your state’s RERA register." />
          <Field label="Your connection to the property" name="ownerRelation" required={false} defaultValue={p?.ownerRelation} maxLength={120} hint="Needed for owners, e.g. sole owner, joint owner with spouse, power of attorney for a parent." />
          <Field label="Years in the business" name="yearsInBusiness" type="number" min={0} max={80} required={false} defaultValue={p?.yearsInBusiness} />
          <Field label="GST number" name="gstNumber" required={false} defaultValue={p?.gstNumber} maxLength={20} />
          <Field label="Website or profile link" name="website" type="url" required={false} defaultValue={p?.website} hint="Your site or a listing-portal profile, starting with https://" />
          <Area label="Office or home address" name="officeAddress" rows={2} required={false} defaultValue={p?.officeAddress} hint="Where our team can reach or visit you. Not shown to buyers." />
          <Area label="Cities and localities you work in" name="cities" rows={2} required={false} defaultValue={p?.cities.join(', ')} hint="Separate with commas." />
          <Area label="About you, for buyers" name="about" rows={3} required={false} defaultValue={p?.about} hint="Shown on your seller page once you are verified." />
        </AdminForm>
      )}

      <h2 id="documents" className="section">2. Documents</h2>
      <p className="lead">
        An identity document for everyone; a RERA certificate for agents; a GST or incorporation certificate for builders; a document showing ownership for owners.
        Only you and our verification team can open these. They are deleted {d.retentionDays} days after your review; the result of the check is kept.
      </p>
      {!p ? <p>Save your details first, then add documents here.</p> : (
        <>
          {p.documents.length > 0 && (
            <div className="atable"><table>
              <thead><tr><th>Document</th><th>Added</th><th><span className="sr">Actions</span></th></tr></thead>
              <tbody>
                {p.documents.map((doc) => (
                  <tr key={doc.id}>
                    <td><a href={`/admin/documents/${doc.id}`} target="_blank" rel="noopener">{DOC_LABEL[doc.kind] ?? doc.kind}</a> <small>({doc.mime === 'application/pdf' ? 'PDF' : 'image'}, {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB)</small></td>
                    <td>{new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</td>
                    <td>{!locked && <ActionButton action={removeDocument.bind(null, doc.id, '/admin/verification?removed=1#documents')} label="Delete" confirm="Delete this document?" tone="danger" />}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          {!locked && (
            <form action="/admin/upload-document" method="post" encType="multipart/form-data" className="aupload">
              <label className="afield"><span>Kind of document</span>
                <select name="kind" required defaultValue=""><option value="">Choose…</option>{Object.entries(DOC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
              <label className="afield"><span>File</span><input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required /><small>PDF, JPEG or PNG, up to 5 MB.</small></label>
              <button type="submit" className="abtn quiet">Add document</button>
            </form>
          )}
        </>
      )}

      {p && (p.status === 'DRAFT' || p.status === 'NEEDS_INFO' || p.status === 'REJECTED') && (
        <section className="section">
          <h2>3. Send for review</h2>
          <p>We check your details, look up your registration, and may call you on {me.phone ?? 'your phone number'}.</p>
          <ActionButton action={submitDealerProfile} label="Send to our team" tone="primary" />
        </section>
      )}
    </>
  );
}

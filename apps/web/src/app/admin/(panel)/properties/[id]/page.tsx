import Link from 'next/link';
import { ActionButton, AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field, STATUS, Select, localityGroups, month, projectGroups, type Options } from '@/components/admin/fields';
import { adminGet, getMe, isStaff } from '@/lib/admin';
import { media } from '@/lib/seo';
import { remove, removePhoto, review, save } from '../../../actions';

interface Property {
  id: string; slug: string; title: string; description: string; type: string; bhk: number; bathrooms: number; priceInr: number; areaSqft: number; floor: number | null; totalFloors: number | null;
  facing: string | null; furnishing: string | null; status: string; possession: string | null; amenities: string[]; listedBy: string; localityId: string; projectId: string | null;
  state: 'PUBLISHED' | 'PENDING' | 'REJECTED'; rejectReason: string | null; photos: { id: string; file: string }[]; owner: { name: string; email: string; phone: string | null } | null;
}
type Search = { created?: string; photos?: string; photoDeleted?: string; error?: string };
const MAX_PHOTOS = 12;

export default async function EditProperty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === 'new';
  const [me, options, p] = await Promise.all([getMe(), adminGet<Options>('/options'), isNew ? null : adminGet<Property>(`/properties/${encodeURIComponent(id)}`)]);
  const staff = isStaff(me.role);
  if (isNew && !staff && !me.emailVerified) {
    // The form would only be refused on save, so it is not offered until the email is confirmed (see the notice above).
    return (<><h1>Post a property</h1><p className="lead">Confirm your email address first, using the link we sent to {me.email}. Then this page will show the form.</p></>);
  }
  return (
    <>
      <p><Link href="/admin/properties">← {staff ? 'Listings' : 'My listings'}</Link></p>
      <h1>{p ? 'Edit listing' : staff ? 'Add a listing' : 'Post a property'}</h1>

      {sp.created && <p role="status" className="anotice">{staff ? 'Listing added and live.' : 'Listing saved and sent for review.'} Add photos below.</p>}
      {sp.photos && <p role="status" className="anotice">{sp.photos} {sp.photos === '1' ? 'photo' : 'photos'} added.</p>}
      {sp.photoDeleted && <p role="status" className="anotice">Photo deleted.</p>}
      {sp.error && <p role="alert" className="aerror">{sp.error}</p>}

      {p && (
        <div className="astatus">
          {p.state === 'PUBLISHED' && <p><span className="tag tag-ready">Live</span> <Link href={`/property/${p.slug}`}>/property/{p.slug}</Link> — the page address stays the same when you change the title.</p>}
          {p.state === 'PENDING' && <p><span className="tag">Waiting for review</span> {staff ? 'Not on the site yet. Check the details and photos, then approve or reject below.' : 'Our team will check this listing before it appears on the site.'}</p>}
          {p.state === 'REJECTED' && <p><span className="tag">Needs changes</span> {p.rejectReason} {!staff && 'Make the change and save to send it for review again.'}</p>}
          {staff && p.owner && <p>Posted by {p.owner.name} ({p.owner.email}{p.owner.phone ? `, ${p.owner.phone}` : ''}).</p>}
          {!staff && p.state === 'PUBLISHED' && <p>Saving a change, or adding a photo, sends the listing back for review and takes it off the site until it is approved.</p>}
        </div>
      )}

      {p && staff && p.state !== 'PUBLISHED' && (
        <section className="areview">
          <h2>Review</h2>
          <ActionButton action={review.bind(null, p.id, 'approve')} label="Approve and publish" tone="primary" />
          <ActionButton action={review.bind(null, p.id, 'reject')} label="Reject" tone="danger">
            <label className="afield"><span>Reason shown to the owner</span><input name="reason" maxLength={300} defaultValue={p.rejectReason ?? ''} placeholder="e.g. The price looks like a typing mistake" /></label>
          </ActionButton>
        </section>
      )}
      {p && staff && p.state === 'PUBLISHED' && (
        <ActionButton action={review.bind(null, p.id, 'reject')} label="Take off the site" confirm="Take this listing off the site?">
          <input type="hidden" name="reason" value="Taken off the site by our team." />
        </ActionButton>
      )}

      <AdminForm action={save.bind(null, 'properties', p?.id ?? null)} submit={p ? (staff ? 'Save changes' : 'Save and send for review') : staff ? 'Add listing' : 'Save and continue to photos'}>
        <Area label="Title" name="title" rows={2} defaultValue={p?.title} hint="Shown as the page heading and in search results, e.g. “3 BHK Flat in Palm Heights, Sector 57, Gurgaon”." />
        <Select label="Type" name="type" defaultValue={p?.type} options={[{ value: 'APARTMENT', label: 'Flat' }, { value: 'VILLA', label: 'Villa' }, { value: 'BUILDER_FLOOR', label: 'Builder floor' }, { value: 'PLOT', label: 'Plot' }]} hint="For a plot, bedrooms, bathrooms, floor and furnishing are ignored." />
        <Field label="Price (₹)" name="priceInr" type="number" min={100000} step={1000} defaultValue={p?.priceInr} hint="In rupees: 1 crore is 10000000." />
        <Field label="Area (sq ft)" name="areaSqft" type="number" min={100} defaultValue={p?.areaSqft} />
        <Field label="Bedrooms (BHK)" name="bhk" type="number" min={0} max={10} required={false} defaultValue={p?.bhk || ''} />
        <Field label="Bathrooms" name="bathrooms" type="number" min={0} max={12} required={false} defaultValue={p?.bathrooms || ''} />
        <Select label="Locality" name="localityId" defaultValue={p?.localityId} groups={localityGroups(options)} />
        <Select label="Project" name="projectId" required={false} defaultValue={p?.projectId} groups={projectGroups(options)} hint="Must be a project in the chosen locality." />
        <Select label="Status" name="status" defaultValue={p?.status} options={STATUS} />
        <Field label="Possession month" name="possession" type="month" required={false} defaultValue={month(p?.possession)} hint="Only used for homes under construction." />
        <Field label="Floor" name="floor" type="number" min={0} max={150} required={false} defaultValue={p?.floor} />
        <Field label="Total floors" name="totalFloors" type="number" min={1} max={150} required={false} defaultValue={p?.totalFloors} />
        <Field label="Facing" name="facing" required={false} defaultValue={p?.facing} maxLength={30} />
        <Select label="Furnishing" name="furnishing" required={false} defaultValue={p?.furnishing} options={['Unfurnished', 'Semi-furnished', 'Furnished'].map((x) => ({ value: x, label: x }))} />
        <Select label="Listed by" name="listedBy" defaultValue={p?.listedBy} options={[{ value: 'OWNER', label: 'Owner' }, { value: 'BUILDER', label: 'Builder' }, { value: 'AGENT', label: 'Agent' }]} />
        <Area label="Description" name="description" rows={5} defaultValue={p?.description} />
        <Area label="Amenities" name="amenities" rows={3} required={false} defaultValue={p?.amenities.join(', ')} hint="Separate with commas or new lines." />
      </AdminForm>

      {p && (
        <section className="section" id="photos">
          <h2>Photos ({p.photos.length} of {MAX_PHOTOS})</h2>
          <p className="lead">The first photo is the cover shown in search results. JPEG, PNG or WebP, up to 5 MB each; they are resized automatically.</p>
          {p.photos.length > 0 && (
            <ul className="aphotos">
              {p.photos.map((ph, i) => (
                <li key={ph.id}>
                  <img src={media(ph.file, 'card')} alt={`Photo ${i + 1}`} width={640} height={480} loading="lazy" />
                  {i === 0 && <span className="tag tag-ready">Cover</span>}
                  <ActionButton action={removePhoto.bind(null, ph.id, p.id)} label="Delete" confirm="Delete this photo?" tone="danger" />
                </li>
              ))}
            </ul>
          )}
          {p.photos.length < MAX_PHOTOS && (
            // A plain upload form handled by /admin/upload, so large files do not pass through a server action.
            <form action={`/admin/upload/${p.id}`} method="post" encType="multipart/form-data" className="aupload">
              <label className="afield"><span>Add photos</span><input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required /></label>
              <button type="submit" className="abtn quiet">Upload</button>
            </form>
          )}
        </section>
      )}

      {p && <DeleteForm action={remove.bind(null, 'properties', p.id)} what="this listing" />}
    </>
  );
}

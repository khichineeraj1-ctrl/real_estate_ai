import Link from 'next/link';
import { ActionButton, AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field, STATUS, Select, localityGroups, month, type Options } from '@/components/admin/fields';
import { adminGet, requireStaff } from '@/lib/admin';
import { media } from '@/lib/seo';
import { PhotoGroup, PhotoGroupField } from '@/components/admin/PhotoGroup';
import { Videos, type AdminVideo } from '@/components/admin/Videos';
import { addVideo, groupPhoto, remove, removeProjectPhoto, removeVideo, save } from '../../../actions';

const MAX_PHOTOS = 12;

interface Project { id: string; photos: { id: string; file: string; category: string | null }[]; videos: AdminVideo[]; slug: string; name: string; builder: string; description: string; status: string; possession: string | null; reraId: string | null; totalUnits: number | null; amenities: string[]; localityId: string; leadEmail: string | null; accountId: string | null; _count: { enquiries: number } }
interface Builder { id: string; name: string; email: string; active: boolean }

export default async function EditProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ photos?: string; photoDeleted?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireStaff();
  const isNew = id === 'new';
  const [options, builders, p] = await Promise.all([adminGet<Options>('/options'), adminGet<Builder[]>('/builders'), isNew ? null : adminGet<Project>(`/projects/${encodeURIComponent(id)}`)]);
  return (
    <>
      <p><Link href="/admin/projects">← Projects</Link></p>
      <h1>{p ? 'Edit project' : 'Add a project'}</h1>
      {p && <p className="lead"><Link href={`/projects/${p.slug}`}>View the public page</Link></p>}
      {p && (
        <div className="astatus">
          <p><strong>{p._count.enquiries} {p._count.enquiries === 1 ? 'lead' : 'leads'}</strong> from buyers on this project and its listings. <Link href={`/admin/enquiries?project=${p.id}`}>View leads</Link>{p._count.enquiries > 0 && <> · <a href={`/admin/enquiries/export?project=${p.id}`}>Download as a spreadsheet</a></>}</p>
        </div>
      )}
      <AdminForm action={save.bind(null, 'projects', p?.id ?? null)} submit={p ? 'Save changes' : 'Add project'}>
        <Field label="Name" name="name" defaultValue={p?.name} maxLength={120} />
        <Field label="Builder" name="builder" defaultValue={p?.builder} maxLength={120} />
        <Select label="Locality" name="localityId" defaultValue={p?.localityId} groups={localityGroups(options)} hint={p ? 'A project with listings cannot be moved.' : undefined} />
        <Select label="Status" name="status" defaultValue={p?.status} options={STATUS} />
        <Field label="Possession month" name="possession" type="month" required={false} defaultValue={month(p?.possession)} hint="Only used while under construction." />
        <Field label="RERA number" name="reraId" required={false} defaultValue={p?.reraId} maxLength={80} />
        <Field label="Total units" name="totalUnits" type="number" min={1} required={false} defaultValue={p?.totalUnits} />
        <Field label="Sales email for leads" name="leadEmail" type="email" required={false} defaultValue={p?.leadEmail} autoComplete="off" hint="The builder’s sales address. When filled in, every lead on this project is emailed there as it arrives. Buyers never see it." />
        <Select label="Builder login" name="accountId" required={false} defaultValue={p?.accountId} options={builders.map((b) => ({ value: b.id, label: `${b.name} (${b.email})${b.active ? '' : ' — deactivated'}` }))} hint="The builder account that can sign in and see this project’s leads. Create one under Users with the role Builder. If no sales email is set above, leads are emailed to this login." />
        <Area label="Description" name="description" rows={5} defaultValue={p?.description} />
        <Area label="Amenities" name="amenities" rows={3} required={false} defaultValue={p?.amenities.join(', ')} hint="Separate with commas or new lines." />
      </AdminForm>
      {p && (
        <section className="section" id="photos">
          <h2>Photos ({p.photos.length} of {MAX_PHOTOS})</h2>
          <p className="lead">The first photo is the cover on the project’s cards; all of them appear on its page. Say what each photo shows and the gallery groups them (Outdoors, Interiors, Floor plans…). Use the builder’s own pictures, or ones you have the right to use. JPEG, PNG or WebP, up to 5 MB each; they are resized automatically.</p>
          {sp.photos && <p role="status" className="anotice">{sp.photos} {sp.photos === '1' ? 'photo' : 'photos'} added.</p>}
          {sp.photoDeleted && <p role="status" className="anotice">Photo deleted.</p>}
          {sp.error && <p role="alert" className="aerror">{sp.error}</p>}
          {p.photos.length > 0 && (
            <ul className="aphotos">
              {p.photos.map((ph, i) => (
                <li key={ph.id}>
                  <img src={media(ph.file, 'card')} alt={`Photo ${i + 1}`} width={640} height={480} loading="lazy" />
                  {i === 0 && <span className="tag tag-ready">Cover</span>}
                  <PhotoGroup action={groupPhoto.bind(null, ph.id)} value={ph.category} />
                  <ActionButton action={removeProjectPhoto.bind(null, ph.id, p.id)} label="Delete" confirm="Delete this photo?" tone="danger" />
                </li>
              ))}
            </ul>
          )}
          {p.photos.length < MAX_PHOTOS && (
            <form action={`/admin/upload-project/${p.id}`} method="post" encType="multipart/form-data" className="aupload">
              <label className="afield"><span>Add photos</span><input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required /></label>
              <PhotoGroupField />
              <button type="submit" className="abtn quiet">Upload</button>
            </form>
          )}
        </section>
      )}

      {p && <Videos videos={p.videos} add={addVideo.bind(null, 'projects', p.id)} remove={(vid) => removeVideo.bind(null, 'projects', p.id, vid)} />}

      {p && <DeleteForm action={remove.bind(null, 'projects', p.id)} what="this project" />}
      {p && <p className="lead">Deleting a project keeps its listings; they just stop being linked to it.</p>}
    </>
  );
}

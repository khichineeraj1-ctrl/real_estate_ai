import { PhotoInput } from '@/components/admin/PhotoInput';
import Link from 'next/link';
import { ActionButton, AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field, STATUS, Select, localityGroups, month, type Options } from '@/components/admin/fields';
import { adminGet, requireStaff } from '@/lib/admin';
import { media } from '@/lib/seo';
import { PhotoGroup, PhotoGroupField } from '@/components/admin/PhotoGroup';
import { Videos, type AdminVideo } from '@/components/admin/Videos';
import { addUnit, addVideo, groupPhoto, remove, removeProjectPhoto, removeUnit, removeVideo, save } from '../../../actions';
import { price } from '@/lib/format';

const MAX_PHOTOS = 12;

interface Project { id: string; photos: { id: string; file: string; category: string | null }[]; videos: AdminVideo[]; slug: string; name: string; builder: string; description: string; status: string; possession: string | null; reraId: string | null; totalUnits: number | null; amenities: string[]; localityId: string; leadEmail: string | null; accountId: string | null; _count: { enquiries: number } }
interface Details { amenities: string[]; amenityOptions: { group: string; items: { code: string; label: string; icon: string }[] }[]; pin: string; locality: { name: string }; units: { id: string; label: string; carpetMinSqft: number; carpetMaxSqft: number | null; priceMinInr: number | null; priceMaxInr: number | null; planFile: string | null }[]; plans: string[] }
interface Builder { id: string; name: string; email: string; active: boolean }

export default async function EditProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ photos?: string; photoDeleted?: string; error?: string; refused?: string; unit?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireStaff();
  const isNew = id === 'new';
  const [options, builders, p] = await Promise.all([adminGet<Options>('/options'), adminGet<Builder[]>('/builders'), isNew ? null : adminGet<Project>(`/projects/${encodeURIComponent(id)}`)]);
  const d = isNew ? null : await adminGet<Details>(`/projects/${encodeURIComponent(id)}/details`);
  const known = new Set((d?.amenityOptions ?? []).flatMap((g) => g.items.map((x) => x.code)));
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
        <Field label="Map pin" name="pin" required={false} defaultValue={d?.pin} maxLength={60} hint={`Two numbers, like 28.4089, 77.0421. In Google Maps, right-click the project’s gate and click the numbers at the top to copy them. Leave empty and distances are measured from the centre of ${d?.locality.name ?? 'the locality'}.`} />
        {d ? (
          <fieldset className="afield wide amen-pick">
            <legend>Amenities <em>(tick what the builder states)</em></legend>
            {d.amenityOptions.map((g) => (
              <div key={g.group}><strong>{g.group}</strong><p>{g.items.map((x) => <label key={x.code}><input type="checkbox" name="amenities" value={x.code} defaultChecked={d.amenities.includes(x.code)} /> <span aria-hidden="true">{x.icon}</span> {x.label}</label>)}</p></div>
            ))}
            <label className="afield"><span>Anything not in the list <em>(optional)</em></span><input name="amenities" defaultValue={d.amenities.filter((a) => !known.has(a)).join(', ')} maxLength={400} /><small>Separate with commas. Shown under “Other”.</small></label>
          </fieldset>
        ) : <Area label="Amenities" name="amenities" rows={3} required={false} hint="Separate with commas. After saving you can tick them from a list." />}
      </AdminForm>
      {p && d && (
        <section className="section" id="units">
          <h2>Homes on offer ({d.units.length})</h2>
          <p className="lead">One line per kind of home: 2 BHK, 3 BHK + Study, Penthouse. Take sizes and prices from the builder’s own price list or brochure; buyers see them marked “as stated by the builder”. To attach a floor plan, first upload it below under Photos in the group “Floor plans”.</p>
          {sp.unit && <p role="status" className="anotice">{sp.unit === 'added' ? 'Added.' : 'Removed.'}</p>}
          {d.units.length > 0 && (
            <div className="atable"><table>
              <thead><tr><th>Home</th><th>Carpet area</th><th>Price</th><th>Floor plan</th><th><span className="sr">Remove</span></th></tr></thead>
              <tbody>{d.units.map((u) => (
                <tr key={u.id}>
                  <td>{u.label}</td>
                  <td>{u.carpetMinSqft}{u.carpetMaxSqft ? ` to ${u.carpetMaxSqft}` : ''} sq ft</td>
                  <td>{u.priceMinInr ? `${price(u.priceMinInr)}${u.priceMaxInr ? ` to ${price(u.priceMaxInr)}` : ''}` : 'On request'}</td>
                  <td>{u.planFile ? <img src={media(u.planFile, 'card')} alt="" width={84} height={64} style={{ objectFit: 'contain', background: '#fff', borderRadius: 6 }} /> : '—'}</td>
                  <td><ActionButton action={removeUnit.bind(null, p.id, u.id)} label="Remove" confirm={`Remove ${u.label}?`} tone="danger" /></td>
                </tr>))}</tbody>
            </table></div>
          )}
          <AdminForm action={addUnit.bind(null, p.id)} submit="Add this home" pendingLabel="Adding…">
            <Field label="Name" name="label" maxLength={60} hint="As the builder calls it, e.g. 3 BHK + Study" />
            <Field label="Carpet area, sq ft" name="carpetMinSqft" type="number" min={100} hint="Carpet area, not super built-up. The smallest, if sizes vary." />
            <Field label="Largest carpet area, sq ft" name="carpetMaxSqft" type="number" min={100} required={false} />
            <Field label="Price from, in rupees" name="priceMinInr" type="number" min={100000} required={false} hint="Leave empty to show “On request”." />
            <Field label="Price to, in rupees" name="priceMaxInr" type="number" min={100000} required={false} />
            <Select label="Floor plan" name="planFile" required={false} options={d.plans.map((f, i) => ({ value: f, label: `Floor plan ${i + 1}` }))} hint={d.plans.length ? 'Numbered in the order they appear under Photos.' : 'None uploaded yet in the “Floor plans” group.'} />
          </AdminForm>
        </section>
      )}

      {p && (
        <section className="section" id="photos">
          <h2>Photos ({p.photos.length} of {MAX_PHOTOS})</h2>
          <p className="lead">The first photo is the cover on the project’s cards; all of them appear on its page. Say what each photo shows and the gallery groups them (Outdoors, Interiors, Floor plans…). Use the builder’s own pictures, or ones you have the right to use. JPEG, PNG or WebP, up to 5 MB each; they are resized automatically.</p>
          {sp.photos && sp.photos !== '0' && <p role="status" className="anotice">{sp.photos} {sp.photos === '1' ? 'photo' : 'photos'} added.</p>}
          {sp.photoDeleted && <p role="status" className="anotice">Photo deleted.</p>}
          {sp.error && <p role="alert" className="aerror">{sp.error}</p>}
      {sp.refused && <div className="land-refused" role="alert"><strong>{sp.refused.split('\n').length === 1 ? 'One photo was not added' : `${sp.refused.split('\n').length} photos were not added`}</strong><ul>{sp.refused.split('\n').map((r, i) => <li key={i}><span>{r}</span></li>)}</ul></div>}
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
              <PhotoInput />
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

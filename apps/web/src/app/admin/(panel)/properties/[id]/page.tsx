import Link from 'next/link';
import { AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field, STATUS, Select, localityGroups, month, projectGroups, type Options } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { remove, save } from '../../../actions';

interface Property {
  id: string; slug: string; title: string; description: string; type: string; bhk: number; bathrooms: number; priceInr: number; areaSqft: number; floor: number | null; totalFloors: number | null;
  facing: string | null; furnishing: string | null; status: string; possession: string | null; amenities: string[]; listedBy: string; localityId: string; projectId: string | null;
}

export default async function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const [options, p] = await Promise.all([adminGet<Options>('/options'), isNew ? null : adminGet<Property>(`/properties/${encodeURIComponent(id)}`)]);
  return (
    <>
      <p><Link href="/admin/properties">← Listings</Link></p>
      <h1>{p ? 'Edit listing' : 'Add a listing'}</h1>
      {p && <p className="lead"><Link href={`/property/${p.slug}`}>/property/{p.slug}</Link> — the page address stays the same when you change the title.</p>}
      <AdminForm action={save.bind(null, 'properties', p?.id ?? null)} submit={p ? 'Save changes' : 'Add listing'}>
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
      {p && <DeleteForm action={remove.bind(null, 'properties', p.id)} what="this listing" />}
    </>
  );
}

import Link from 'next/link';
import { AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field, STATUS, Select, localityGroups, month, type Options } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { remove, save } from '../../../actions';

interface Project { id: string; slug: string; name: string; builder: string; description: string; status: string; possession: string | null; reraId: string | null; totalUnits: number; amenities: string[]; localityId: string }

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const [options, p] = await Promise.all([adminGet<Options>('/options'), isNew ? null : adminGet<Project>(`/projects/${encodeURIComponent(id)}`)]);
  return (
    <>
      <p><Link href="/admin/projects">← Projects</Link></p>
      <h1>{p ? 'Edit project' : 'Add a project'}</h1>
      {p && <p className="lead"><Link href={`/projects/${p.slug}`}>/projects/{p.slug}</Link></p>}
      <AdminForm action={save.bind(null, 'projects', p?.id ?? null)} submit={p ? 'Save changes' : 'Add project'}>
        <Field label="Name" name="name" defaultValue={p?.name} maxLength={120} />
        <Field label="Builder" name="builder" defaultValue={p?.builder} maxLength={120} />
        <Select label="Locality" name="localityId" defaultValue={p?.localityId} groups={localityGroups(options)} hint={p ? 'A project with listings cannot be moved.' : undefined} />
        <Select label="Status" name="status" defaultValue={p?.status} options={STATUS} />
        <Field label="Possession month" name="possession" type="month" required={false} defaultValue={month(p?.possession)} hint="Only used while under construction." />
        <Field label="RERA number" name="reraId" required={false} defaultValue={p?.reraId} maxLength={80} />
        <Field label="Total units" name="totalUnits" type="number" min={1} defaultValue={p?.totalUnits} />
        <Area label="Description" name="description" rows={5} defaultValue={p?.description} />
        <Area label="Amenities" name="amenities" rows={3} required={false} defaultValue={p?.amenities.join(', ')} hint="Separate with commas or new lines." />
      </AdminForm>
      {p && <DeleteForm action={remove.bind(null, 'projects', p.id)} what="this project" />}
      {p && <p className="lead">Deleting a project keeps its listings; they just stop being linked to it.</p>}
    </>
  );
}

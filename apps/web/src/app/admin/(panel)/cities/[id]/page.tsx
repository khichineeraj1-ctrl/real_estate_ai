import Link from 'next/link';
import { AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field } from '@/components/admin/fields';
import { adminGet, requireStaff } from '@/lib/admin';
import { remove, save } from '../../../actions';

interface City { id: string; slug: string; name: string; state: string; intro: string; lat: number; lng: number }

export default async function EditCity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const c = id === 'new' ? null : await adminGet<City>(`/cities/${encodeURIComponent(id)}`);
  return (
    <>
      <p><Link href="/admin/cities">← Cities</Link></p>
      <h1>{c ? `Edit ${c.name}` : 'Add a city'}</h1>
      {c && <p className="lead"><Link href={`/${c.slug}`}>/{c.slug}</Link> — the page address stays the same if you rename the city.</p>}
      <AdminForm action={save.bind(null, 'cities', c?.id ?? null)} submit={c ? 'Save changes' : 'Add city'}>
        <Field label="Name" name="name" defaultValue={c?.name} maxLength={80} />
        <Field label="State" name="state" defaultValue={c?.state} maxLength={80} />
        <Field label="Latitude" name="lat" type="number" step="any" min={-90} max={90} defaultValue={c?.lat} />
        <Field label="Longitude" name="lng" type="number" step="any" min={-180} max={180} defaultValue={c?.lng} />
        <Area label="Introduction" name="intro" rows={4} defaultValue={c?.intro} hint="The opening paragraph of the city page." />
      </AdminForm>
      {c && <DeleteForm action={remove.bind(null, 'cities', c.id)} what="this city" />}
    </>
  );
}

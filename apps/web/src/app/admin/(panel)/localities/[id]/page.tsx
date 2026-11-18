import Link from 'next/link';
import { AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field, Select, type Options } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { remove, save } from '../../../actions';

interface Locality { id: string; slug: string; name: string; intro: string; highlights: string[]; lat: number; lng: number; cityId: string }

export default async function EditLocality({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const [options, l] = await Promise.all([adminGet<Options>('/options'), isNew ? null : adminGet<Locality>(`/localities/${encodeURIComponent(id)}`)]);
  const city = l && options.cities.find((c) => c.id === l.cityId);
  return (
    <>
      <p><Link href="/admin/localities">← Localities</Link></p>
      <h1>{l ? `Edit ${l.name}` : 'Add a locality'}</h1>
      {l && <p className="lead">In {city?.name}. The city and the page address cannot be changed after creation.</p>}
      <AdminForm action={save.bind(null, 'localities', l?.id ?? null)} submit={l ? 'Save changes' : 'Add locality'}>
        {!l && <Select label="City" name="cityId" options={options.cities.map((c) => ({ value: c.id, label: c.name }))} />}
        <Field label="Name" name="name" defaultValue={l?.name} maxLength={80} />
        <Field label="Latitude" name="lat" type="number" step="any" min={-90} max={90} defaultValue={l?.lat} />
        <Field label="Longitude" name="lng" type="number" step="any" min={-180} max={180} defaultValue={l?.lng} />
        <Area label="Introduction" name="intro" rows={4} defaultValue={l?.intro} hint="The opening paragraph of the locality page." />
        <Area label="Highlights" name="highlights" rows={4} required={false} defaultValue={l?.highlights.join('\n')} hint="One per line, e.g. “Metro station within 2 km”. Up to 8." />
      </AdminForm>
      {l && <DeleteForm action={remove.bind(null, 'localities', l.id)} what="this locality" />}
    </>
  );
}

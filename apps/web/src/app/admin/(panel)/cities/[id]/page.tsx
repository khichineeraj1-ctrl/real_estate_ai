import Link from 'next/link';
import { AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field } from '@/components/admin/fields';
import { adminGet, requireStaff } from '@/lib/admin';
import { remove, save } from '../../../actions';

interface City { id: string; slug: string; name: string; state: string; intro: string; lat: number; lng: number; stampDutyPct: number | null; stampDutyWomenPct: number | null; registrationPct: number | null; registrationCapInr: number | null; costNote: string | null; costReviewedAt: string | null }

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
        <h2 className="wide">Government charges on a purchase</h2>
        <p className="wide lead">Used by the “true cost of buying” calculator on every property page in this city. {c?.costReviewedAt ? `Last checked on ${new Date(c.costReviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}.` : 'Nobody has checked these against the official rates yet, and buyers are told so.'}</p>
        <Field label="Stamp duty (%)" name="stampDutyPct" type="number" step="any" min={0} max={25} required={false} defaultValue={c?.stampDutyPct} />
        <Field label="Stamp duty for a woman buyer (%)" name="stampDutyWomenPct" type="number" step="any" min={0} max={25} required={false} defaultValue={c?.stampDutyWomenPct} hint="Leave empty if there is no concession." />
        <Field label="Registration fee (%)" name="registrationPct" type="number" step="any" min={0} max={25} required={false} defaultValue={c?.registrationPct} />
        <Field label="Registration fee limit (₹)" name="registrationCapInr" type="number" min={0} required={false} defaultValue={c?.registrationCapInr} hint="Leave empty if the fee has no upper limit." />
        <Area label="Note shown with the estimate" name="costNote" rows={3} required={false} defaultValue={c?.costNote} hint="What the figures leave out or where they differ within the city." />
        <label className="acheck wide"><input type="checkbox" name="costReviewed" value="yes" /> <span>I have checked these rates against the official schedule today. (Saving without this tick marks them as unchecked again.)</span></label>
      </AdminForm>
      {c && <DeleteForm action={remove.bind(null, 'cities', c.id)} what="this city" />}
    </>
  );
}

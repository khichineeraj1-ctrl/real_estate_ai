import Link from 'next/link';
import { ActionButton, AdminForm } from '@/components/admin/Form';
import { Area } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { addLandmarks, removeLandmark } from '../../actions';

export const metadata = { title: 'Nearby places' };
interface Data { cities: { slug: string; name: string; count: number }[]; city: string | null; kinds: { code: string; label: string }[]; rows: { id: string; kind: string; name: string; lat: number; lng: number }[] }

export default async function Landmarks({ searchParams }: { searchParams: Promise<{ city?: string; added?: string; removed?: string }> }) {
  const sp = await searchParams;
  const d = await adminGet<Data>(`/landmarks${sp.city ? `?city=${encodeURIComponent(sp.city)}` : ''}`);
  const city = d.cities.find((c) => c.slug === d.city);
  const label = Object.fromEntries(d.kinds.map((k) => [k.code, k.label]));
  return (
    <>
      <div className="ahead"><h1>Nearby places</h1></div>
      <p className="lead">The places project pages measure distances to: metro stations, the airport, railway stations, business districts, well-known schools, hospitals and malls. One list per city. Every project in that city then shows its nearest ones, as straight-line distances.</p>
      {sp.added && <p role="status" className="astatus">{sp.added} place{sp.added === '1' ? '' : 's'} saved.</p>}
      {sp.removed && <p role="status" className="astatus">Removed.</p>}
      <p className="afilter">{d.cities.map((c) => <Link key={c.slug} href={`/admin/landmarks?city=${c.slug}`} aria-current={c.slug === d.city ? 'page' : undefined}>{c.name} ({c.count})</Link>)}</p>
      {city && (
        <>
          <h2>Add places in {city.name}</h2>
          <AdminForm action={addLandmarks.bind(null, city.slug)} submit="Save these places" pendingLabel="Saving…">
            <Area label="One place per line" name="lines" rows={8} hint={`Kind | Name | pin. Kinds: ${d.kinds.map((k) => k.code).join(', ')}. Example: METRO | Sector 55-56 | 28.4244, 77.1034. To get a pin, right-click the place in Google Maps and click the numbers. A place already in the list is updated.`} />
          </AdminForm>
          <h2>In {city.name} now ({d.rows.length})</h2>
          {d.rows.length === 0 ? <p>None yet. Until there are some, project pages in {city.name} show the map only.</p> : (
            <div className="atable"><table>
              <thead><tr><th>Kind</th><th>Name</th><th>Pin</th><th><span className="sr">Remove</span></th></tr></thead>
              <tbody>{d.rows.map((r) => (
                <tr key={r.id}>
                  <td>{label[r.kind] ?? r.kind}</td><td>{r.name}</td>
                  <td><a href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=15/${r.lat}/${r.lng}`} target="_blank" rel="noopener noreferrer">{r.lat}, {r.lng} ↗</a></td>
                  <td><ActionButton action={removeLandmark.bind(null, city.slug, r.id)} label="Remove" confirm={`Remove ${r.name}?`} tone="danger" /></td>
                </tr>))}</tbody>
            </table></div>
          )}
        </>
      )}
    </>
  );
}

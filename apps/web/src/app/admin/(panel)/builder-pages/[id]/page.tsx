import Link from 'next/link';
import { AdminForm } from '@/components/admin/Form';
import { Field, Select } from '@/components/admin/fields';
import { adminGet, requireStaff } from '@/lib/admin';
import { mergeBuilderPage, renameBuilderPage } from '../../../actions';

interface Detail { id: string; slug: string; name: string; projects: { id: string; name: string; builder: string; locality: { name: string; city: { name: string } } }[] }
interface Row { id: string; name: string; _count: { projects: number } }

export default async function EditBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const [b, all] = await Promise.all([adminGet<Detail>(`/builder-pages/${encodeURIComponent(id)}`), adminGet<Row[]>('/builder-pages')]);
  return (
    <>
      <p><Link href="/admin/builder-pages">← Builder pages</Link></p>
      <h1>{b.name}</h1>
      <p className="lead"><Link href={`/builders/${b.slug}`}>/builders/{b.slug}</Link> — the address stays the same if you change the name.</p>

      <AdminForm action={renameBuilderPage.bind(null, b.id)} submit="Save name">
        <Field label="Name shown to buyers" name="name" defaultValue={b.name} maxLength={120} hint="The name people know the builder by, e.g. “DLF”, not the registered company name." />
      </AdminForm>

      <h2>Projects on this page</h2>
      <div className="atable"><table>
        <thead><tr><th>Project</th><th>Registered by</th><th>Where</th></tr></thead>
        <tbody>{b.projects.map((p) => <tr key={p.id}><td><Link href={`/admin/projects/${p.id}`}>{p.name}</Link></td><td>{p.builder}</td><td>{p.locality.name}, {p.locality.city.name}</td></tr>)}</tbody>
      </table></div>

      <h2>Merge into another builder</h2>
      <p className="lead">Use this when {b.name} is the same builder as another page, for example two companies of one group. {b.projects.length === 1 ? 'Its project moves' : `All ${b.projects.length} projects move`} to the builder you choose, and this page’s address then leads there. It cannot be undone from here.</p>
      <AdminForm action={mergeBuilderPage.bind(null, b.id)} submit={`Merge ${b.name} into the chosen builder`} pendingLabel="Merging…">
        <Select label="Builder to merge into" name="intoId" options={all.filter((x) => x.id !== b.id).map((x) => ({ value: x.id, label: `${x.name} (${x._count.projects})` }))} />
      </AdminForm>
    </>
  );
}

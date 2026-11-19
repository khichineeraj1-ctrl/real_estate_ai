import Link from 'next/link';
import { adminGet, getMe, isStaff } from '@/lib/admin';

export const metadata = { title: 'Guides and blog' };

interface Row { id: string; slug: string; kind: string; title: string; status: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'; reviewNote: string | null; updatedAt: string; publishedAt: string | null; author: { name: string } | null }
const STATUS = { DRAFT: 'Draft', SUBMITTED: 'With the team for review', PUBLISHED: 'Published' };
const TABS = [['', 'All'], ['DRAFT', 'Drafts'], ['SUBMITTED', 'For review'], ['PUBLISHED', 'Published']] as const;
const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function Articles({ searchParams }: { searchParams: Promise<{ status?: string; removed?: string }> }) {
  const sp = await searchParams;
  const me = await getMe();
  const staff = isStaff(me.role);
  const status = TABS.find(([v]) => v === sp.status)?.[0] ?? '';
  const rows = await adminGet<Row[]>(`/articles${status ? `?status=${status}` : ''}`);
  return (
    <>
      <div className="ahead"><h1>Guides and blog</h1><Link className="abtn" href="/admin/articles/new">Write a new piece</Link></div>
      <p className="lead">{staff ? 'Everything the writers have written. Read a piece sent for review and publish it, or send it back with a note.' : 'Your guides and blog posts. Write a draft, send it for review, and an editor publishes it.'}</p>
      {sp.removed && <p role="status" className="astatus">Deleted.</p>}
      <p className="afilter">{TABS.map(([v, label]) => <Link key={v} href={`/admin/articles${v ? `?status=${v}` : ''}`} aria-current={status === v ? 'page' : undefined}>{label}</Link>)}</p>
      {rows.length === 0 ? <p className="empty">Nothing here yet. <Link href="/admin/articles/new">Write the first piece</Link>.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Title</th><th>Kind</th>{staff && <th>Writer</th>}<th>Status</th><th>Last changed</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/admin/articles/${a.id}`}>{a.title}</Link>{a.reviewNote && a.status === 'DRAFT' ? <><br /><small>Sent back: {a.reviewNote}</small></> : null}</td>
                <td>{a.kind === 'GUIDE' ? 'Guide' : 'Blog post'}</td>
                {staff && <td>{a.author?.name ?? '—'}</td>}
                <td><span className={a.status === 'PUBLISHED' ? 'aok' : a.status === 'SUBMITTED' ? 'await' : undefined}>{STATUS[a.status]}</span>{a.status === 'PUBLISHED' ? <><br /><small><Link href={`/${a.kind === 'GUIDE' ? 'guides' : 'blog'}/${a.slug}`}>View on the site</Link></small></> : null}</td>
                <td>{when(a.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );
}

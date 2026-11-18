import Link from 'next/link';
import { adminGet } from '@/lib/admin';

export const metadata = { title: 'Questions' };
interface Q { id: string; text: string; live: boolean; total: number; relaxed: string | null; page: string | null; createdAt: string }
interface Data { items: Q[]; total: number; page: number; pageSize: number; all: number; empty: number }

export default async function Questions({ searchParams }: { searchParams: Promise<{ only?: string; page?: string }> }) {
  const sp = await searchParams;
  const only = sp.only === 'empty' ? 'empty' : '';
  const d = await adminGet<Data>(`/questions?only=${only}&page=${encodeURIComponent(sp.page ?? '1')}`);
  const pages = Math.max(1, Math.ceil(d.total / d.pageSize));
  const link = (p: number) => `/admin/questions?${only ? 'only=empty&' : ''}page=${p}`;
  return (
    <>
      <h1>Questions buyers asked</h1>
      <p className="lead">Only the words and the outcome are kept, not who asked. “No exact match” means nothing fitted the question as asked, so the answer offered the nearest alternative or nothing at all: these show where to add listings or localities.</p>
      <p className="afilter">
        <Link href="/admin/questions" aria-current={only ? undefined : 'page'}>All ({d.all})</Link>
        <Link href="/admin/questions?only=empty" aria-current={only ? 'page' : undefined}>No exact match ({d.empty})</Link>
      </p>
      {d.items.length === 0 ? <p>No questions recorded yet.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Question</th><th>Result</th><th>Answered by</th><th>Led to</th><th>When</th></tr></thead>
          <tbody>
            {d.items.map((q) => (
              <tr key={q.id}>
                <td>{q.text}</td><td>{q.total === 0 ? 'Nothing found' : q.relaxed ? `No exact match; ${q.total} shown after dropping the ${q.relaxed}` : `${q.total} found`}</td><td>{q.live ? 'Claude' : 'Built-in parser'}</td>
                <td>{q.page ? <Link href={q.page}>{q.page}</Link> : '—'}</td>
                <td>{new Date(q.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {pages > 1 && <p className="apager">{d.page > 1 && <Link href={link(d.page - 1)}>← Newer</Link>} Page {d.page} of {pages} {d.page < pages && <Link href={link(d.page + 1)}>Older →</Link>}</p>}
    </>
  );
}

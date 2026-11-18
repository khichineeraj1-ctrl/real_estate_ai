import Link from 'next/link';
import { adminGet } from '@/lib/admin';

interface Overview { cities: number; localities: number; projects: number; properties: number; questions: number; questionsWeek: number; emptyWeek: number }

export default async function AdminHome() {
  const o = await adminGet<Overview>('/overview');
  const tiles: [string, number, string][] = [['Listings', o.properties, '/admin/properties'], ['Projects', o.projects, '/admin/projects'], ['Localities', o.localities, '/admin/localities'], ['Cities', o.cities, '/admin/cities']];
  return (
    <>
      <h1>Admin</h1>
      <ul className="tiles">
        {tiles.map(([label, n, href]) => <li key={href}><Link href={href}><strong>{n.toLocaleString('en-IN')}</strong><span>{label}</span></Link></li>)}
      </ul>
      <section className="section">
        <h2>Questions buyers asked</h2>
        <p>{o.questionsWeek} in the last 7 days, of which {o.emptyWeek} had no exact match. {o.questions.toLocaleString('en-IN')} recorded in total.</p>
        <p><Link href="/admin/questions?only=empty">See questions with no exact match</Link> · <Link href="/admin/questions">See all questions</Link></p>
      </section>
    </>
  );
}

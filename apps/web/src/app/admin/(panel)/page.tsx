import Link from 'next/link';
import { adminGet } from '@/lib/admin';

type Overview =
  | { role: 'AGENT'; name: string; mine: { published: number; pending: number; rejected: number } }
  | { role: 'ADMIN' | 'EDITOR'; name: string; cities: number; localities: number; projects: number; properties: number; pending: number; questions: number; questionsWeek: number; emptyWeek: number };

export default async function AdminHome() {
  const o = await adminGet<Overview>('/overview');

  if (o.role === 'AGENT') {
    const tiles: [string, number, string][] = [['Live on the site', o.mine.published, 'PUBLISHED'], ['Waiting for approval', o.mine.pending, 'PENDING'], ['Need changes', o.mine.rejected, 'REJECTED']];
    return (
      <>
        <div className="ahead"><h1>Welcome, {o.name}</h1><Link className="abtn" href="/admin/properties/new">Post a property</Link></div>
        <p className="lead">Each listing is checked by our team before it appears on the site. If something needs changing we will tell you why here.</p>
        <ul className="tiles">
          {tiles.map(([label, n, state]) => <li key={state}><Link href={`/admin/properties?state=${state}`}><strong>{n}</strong><span>{label}</span></Link></li>)}
        </ul>
      </>
    );
  }

  const tiles: [string, number, string][] = [['Live listings', o.properties, '/admin/properties?state=PUBLISHED'], ['Waiting for review', o.pending, '/admin/properties?state=PENDING'], ['Projects', o.projects, '/admin/projects'], ['Localities', o.localities, '/admin/localities'], ['Cities', o.cities, '/admin/cities']];
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

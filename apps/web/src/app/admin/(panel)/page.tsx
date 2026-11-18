import Link from 'next/link';
import { adminGet } from '@/lib/admin';

interface BuilderProject { id: string; slug: string; name: string; leads: number; leadsWeek: number; locality: { name: string; city: { name: string } } }
type Overview =
  | { role: 'BUILDER'; name: string; projects: BuilderProject[] }
  | { role: 'AGENT'; name: string; enquiries: number; mine: { published: number; pending: number; rejected: number } }
  | { role: 'ADMIN' | 'EDITOR'; name: string; enquiries: number; cities: number; localities: number; projects: number; properties: number; pending: number; questions: number; questionsWeek: number; emptyWeek: number };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ welcome?: string; verified?: string }> }) {
  const [o, sp] = await Promise.all([adminGet<Overview>('/overview'), searchParams]);
  const notice = sp.verified ? <p role="status" className="anotice">Your email is confirmed. You can post your property now.</p> : sp.welcome ? <p role="status" className="anotice">Your account is ready. Confirm your email with the link we sent you, then post your property.</p> : null;

  if (o.role === 'BUILDER') {
    return (
      <>
        <h1>Welcome, {o.name}</h1>
        {o.projects.length === 0 ? <p className="lead">No projects are linked to your login yet. Ask our team to link your projects, and their leads will appear here.</p> : (
          <>
            <p className="lead">Buyers who asked for a call back about your projects. Each lead is also emailed to you as it arrives.</p>
            <div className="atable"><table>
              <thead><tr><th>Project</th><th>Where</th><th>Leads this week</th><th>All leads</th><th><span className="sr">Actions</span></th></tr></thead>
              <tbody>
                {o.projects.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/admin/enquiries?project=${p.id}`}>{p.name}</Link></td><td>{p.locality.name}, {p.locality.city.name}</td><td>{p.leadsWeek}</td><td>{p.leads}</td>
                    <td><Link href={`/projects/${p.slug}`}>View page</Link></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <p><Link href="/admin/enquiries">See all leads</Link></p>
          </>
        )}
      </>
    );
  }

  if (o.role === 'AGENT') {
    const tiles: [string, number, string][] = [['Live on the site', o.mine.published, 'PUBLISHED'], ['Waiting for approval', o.mine.pending, 'PENDING'], ['Need changes', o.mine.rejected, 'REJECTED']];
    return (
      <>
        {notice}
        <div className="ahead"><h1>Welcome, {o.name}</h1><Link className="abtn" href="/admin/properties/new">Post a property</Link></div>
        <p className="lead">Each listing is checked by our team before it appears on the site. If something needs changing we will tell you why here.</p>
        <ul className="tiles">
          {tiles.map(([label, n, state]) => <li key={state}><Link href={`/admin/properties?state=${state}`}><strong>{n}</strong><span>{label}</span></Link></li>)}
          <li><Link href="/admin/enquiries"><strong>{o.enquiries}</strong><span>Enquiries from buyers</span></Link></li>
        </ul>
      </>
    );
  }

  const tiles: [string, number, string][] = [['Live listings', o.properties, '/admin/properties?state=PUBLISHED'], ['Waiting for review', o.pending, '/admin/properties?state=PENDING'], ['Enquiries this week', o.enquiries, '/admin/enquiries'], ['Projects', o.projects, '/admin/projects'], ['Localities', o.localities, '/admin/localities'], ['Cities', o.cities, '/admin/cities']];
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

import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { api } from '@/lib/api';
import type { BuilderSummary } from '@/lib/types';

const title = 'Builders and Developers — Projects in Gurgaon, Bengaluru, Mumbai and Pune';
const description = 'Find a builder and see every project it has registered with RERA in Gurgaon, Bengaluru, Mumbai and Pune.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/builders' }, openGraph: { title, description, url: '/builders' } };

const count = (n: number) => `${n} ${n === 1 ? 'project' : 'projects'}`;

export default async function Builders() {
  const builders = (await api<BuilderSummary[]>('/builders')) ?? [];
  const top = [...builders].sort((a, b) => b.projects - a.projects || a.name.localeCompare(b.name)).filter((b) => b.projects >= 3).slice(0, 12);
  // Grouped by first letter; names that start with a digit go together under "0–9".
  const groups = new Map<string, BuilderSummary[]>();
  for (const b of builders) { const k = /^[a-z]/i.test(b.name) ? b.name[0].toUpperCase() : '0–9'; (groups.get(k) ?? groups.set(k, []).get(k)!).push(b); }
  const letters = [...groups.keys()].sort((a, b) => (a === '0–9' ? 1 : b === '0–9' ? -1 : a.localeCompare(b)));
  const id = (k: string) => (k === '0–9' ? 'other' : k.toLowerCase());
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Builders', path: '/builders' }]} />
      <h1>Builders and developers</h1>
      <p className="lead">{builders.length} builders with projects on the public RERA registers. A builder’s page lists every project it has registered, whichever of its companies registered it.</p>

      {top.length > 0 && (
        <section className="section">
          <h2>Builders with the most projects</h2>
          <ul className="tiles">
            {top.map((b) => <li key={b.slug}><Link href={`/builders/${b.slug}`}><strong>{b.name}</strong><span>{count(b.projects)} · {b.cities.join(', ')}</span></Link></li>)}
          </ul>
        </section>
      )}

      <section className="section">
        <h2>All builders, A to Z</h2>
        <nav aria-label="Jump to a letter"><ul className="chips left">{letters.map((k) => <li key={k}><a href={`#${id(k)}`}>{k}</a></li>)}</ul></nav>
        {letters.map((k) => (
          <div key={k} className="az">
            <h3 id={id(k)}>{k}</h3>
            <ul>{groups.get(k)!.map((b) => <li key={b.slug}><Link href={`/builders/${b.slug}`}>{b.name}</Link> <small>{count(b.projects)}</small></li>)}</ul>
          </div>
        ))}
      </section>
    </>
  );
}

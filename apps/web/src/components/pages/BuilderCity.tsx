import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { api } from '@/lib/api';
import { monthYear } from '@/lib/format';
import { abs, builderPath, projectPath, pageMeta } from '@/lib/seo';
import type { BuilderDetail, Place } from '@/lib/types';

/** One builder's projects in one city, at /<city>/<builder>. Null when the builder has nothing in that city. */
export async function loadBuilderCity(city: string, builder: string): Promise<{ b: BuilderDetail; city: Place } | { movedTo: string } | null> {
  const b = await api<BuilderDetail | { movedTo: string }>(`/builders/${encodeURIComponent(builder)}?city=${encodeURIComponent(city)}`);
  if (!b) return null;
  if ('movedTo' in b) return { movedTo: builderPath(city, b.movedTo) }; // merged into another builder
  const here = b.cities.find((c) => c.slug === city);
  return here ? { b, city: here } : null;
}

const count = (n: number) => `${n} ${n === 1 ? 'project' : 'projects'}`;
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function builderCityMetadata(b: BuilderDetail, city: Place): Metadata {
  const path = builderPath(city.slug, b.slug);
  const title = `${b.name} Projects in ${city.name} — ${b.projects.length} ${b.projects.length === 1 ? 'Project' : 'Projects'}, RERA Details`;
  const localities = [...new Set(b.projects.map((p) => p.locality.name))];
  const description = `${count(b.projects.length)} by ${b.name} in ${city.name}${localities.length ? `, in ${list(localities.slice(0, 4))}${localities.length > 4 ? ' and more' : ''}` : ''}. RERA registration numbers and status for each.`;
  return pageMeta({ title, description, path: path });
}

export function BuilderCityView({ b, city, others = [] }: { b: BuilderDetail; city: Place; others?: (Place & { projects: number })[] }) {
  const path = builderPath(city.slug, b.slug);
  const fromRegister = b.projects.some((p) => p.registerSource);
  const otherNames = b.registeredAs.filter((n) => n !== b.name);
  const elsewhere = b.cities.filter((c) => c.slug !== city.slug);
  // Grouped by locality, so a buyer who knows the area finds it quickly.
  const byLocality = new Map<string, { locality: Place; projects: BuilderDetail['projects'] }>();
  for (const p of b.projects) (byLocality.get(p.locality.slug) ?? byLocality.set(p.locality.slug, { locality: p.locality, projects: [] }).get(p.locality.slug)!).projects.push(p);
  const groups = [...byLocality.values()].sort((x, y) => y.projects.length - x.projects.length || x.locality.name.localeCompare(y.locality.name));
  return (
    <>
      <Breadcrumbs crumbs={[{ name: city.name, path: `/${city.slug}` }, { name: b.name, path }]} />
      <h1>{b.name} projects in {city.name}</h1>
      <p className="lead">
        {b.name} has {count(b.projects.length)} in {city.name} listed here, in {list(groups.map((g) => g.locality.name))}.
        {otherNames.length > 0 && ` ${otherNames.length === 1 ? 'They are registered under the company name' : 'They are registered under these company names:'} ${list(otherNames)}.`}
      </p>
      {fromRegister && <p className="calc-note">Project details come from the public RERA register and have not been confirmed by the builder. The register does not give prices.</p>}

      {groups.map(({ locality, projects }) => (
        <section className="section" key={locality.slug}>
          <h2>{b.name} in <Link href={`/${city.slug}/${locality.slug}`}>{locality.name}</Link></h2>
          <ul className="tiles">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link href={projectPath(city.slug, { slug: p.slug, brand: b })}>
                  <strong>{p.name}</strong>
                  <span>{locality.name}, {city.name}</span>
                  <span>{/lapsed/i.test(p.registerStatus ?? '') ? 'RERA registration lapsed' : p.registerValidUntil ? `RERA registration to ${monthYear(p.registerValidUntil)}` : p.reraId ? 'RERA registered' : ''}{p.homes > 0 ? ` · ${p.homes} ${p.homes === 1 ? 'home' : 'homes'} for sale` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {elsewhere.length > 0 && (
        <section className="section">
          <h2>{b.name} in other cities</h2>
          <ul className="chips left">{elsewhere.map((c) => <li key={c.slug}><Link href={builderPath(c.slug, b.slug)}>{b.name} projects in {c.name}</Link></li>)}</ul>
        </section>
      )}
      {others.length > 0 && (
        <section className="section">
          <h2>Other builders in {city.name}</h2>
          <ul className="chips left">{others.map((o) => <li key={o.slug}><Link href={builderPath(city.slug, o.slug)}>{o.name} <small>({o.projects})</small></Link></li>)}</ul>
        </section>
      )}
      <p className="section"><Link href="/builders">All builders</Link> · <Link href={`/${city.slug}`}>Property in {city.name}</Link></p>

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ItemList', name: `${b.name} projects in ${city.name}`, numberOfItems: b.projects.length,
        itemListElement: b.projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: abs(projectPath(city.slug, { slug: p.slug, brand: b })) })),
      }} />
    </>
  );
}

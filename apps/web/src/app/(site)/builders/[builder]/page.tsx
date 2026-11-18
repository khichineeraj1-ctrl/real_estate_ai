import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { api } from '@/lib/api';
import { monthYear } from '@/lib/format';
import { abs, builderPath, projectPath } from '@/lib/seo';
import type { BuilderDetail } from '@/lib/types';

type Props = { params: Promise<{ builder: string }> };

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const count = (n: number) => `${n} ${n === 1 ? 'project' : 'projects'}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await api<BuilderDetail | { movedTo: string }>(`/builders/${(await params).builder}`);
  if (!b || 'movedTo' in b) return {};
  const where = list(b.cities.map((c) => c.name));
  const title = `${b.name} Projects in ${where} — RERA-Registered Projects`;
  const description = `${count(b.projects.length)} by ${b.name} in ${where}, with RERA registration numbers and localities.`;
  return { title, description, alternates: { canonical: `/builders/${b.slug}` }, openGraph: { title, description, url: `/builders/${b.slug}` } };
}

export default async function BuilderPage({ params }: Props) {
  const b = await api<BuilderDetail | { movedTo: string }>(`/builders/${(await params).builder}`);
  if (!b) notFound();
  if ('movedTo' in b) permanentRedirect(`/builders/${b.movedTo}`); // merged into another builder
  // A builder in one city has its page there; this page is only for builders that work in several.
  if (b.cities.length === 1) permanentRedirect(builderPath(b.cities[0].slug, b.slug));
  const path = `/builders/${b.slug}`;
  const fromRegister = b.projects.some((p) => p.registerSource);
  const otherNames = b.registeredAs.filter((n) => n !== b.name);
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Builders', path: '/builders' }, { name: b.name, path }]} />
      <h1>{b.name}: projects in {list(b.cities.map((c) => c.name))}</h1>
      <p className="lead">
        {b.name} has {count(b.projects.length)} listed here{b.cities.length > 1 ? `, across ${list(b.cities.map((c) => c.name))}` : ''}.
        {otherNames.length > 0 && ` ${otherNames.length === 1 ? 'They are registered under the company name' : 'They are registered under these company names:'} ${list(otherNames)}.`}
      </p>
      {fromRegister && <p className="calc-note">Project details come from the public RERA registers and have not been confirmed by the builder. The registers do not give prices.</p>}

      {b.cities.map((city) => {
        const projects = b.projects.filter((p) => p.city.slug === city.slug);
        return (
          <section className="section" key={city.slug}>
            <h2><Link href={builderPath(city.slug, b.slug)}>{b.name} projects in {city.name}</Link></h2>
            <ul className="tiles">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link href={projectPath(city.slug, { slug: p.slug, brand: b })}>
                    <strong>{p.name}</strong>
                    <span>{p.locality.name}, {city.name}</span>
                    <span>{/lapsed/i.test(p.registerStatus ?? '') ? 'RERA registration lapsed' : p.registerValidUntil ? `RERA registration to ${monthYear(p.registerValidUntil)}` : p.reraId ? 'RERA registered' : ''}{p.homes > 0 ? ` · ${p.homes} ${p.homes === 1 ? 'home' : 'homes'} for sale` : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ItemList', name: `${b.name} projects`, numberOfItems: b.projects.length,
        itemListElement: b.projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: abs(projectPath(p.city.slug, { slug: p.slug, brand: b })) })),
      }} />
    </>
  );
}

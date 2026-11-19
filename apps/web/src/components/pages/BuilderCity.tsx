import { TrackRecord } from '@/components/TrackRecord';
import { ProjectTile } from '@/components/ProjectTile';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
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
  return pageMeta({ title, description, path, noindex: !b.indexable });
}

const lapsed = (status: string | null) => /lapsed/i.test(status ?? '');
/** Where a registration stands today, from the register's own status and end date. */
function standing(status: string | null, validUntil: string | null): 'lapsed' | 'ended' | 'current' | 'unknown' {
  if (lapsed(status)) return 'lapsed';
  if (!validUntil) return 'unknown';
  return new Date(validUntil) < new Date() ? 'ended' : 'current';
}
const STANDING = { lapsed: 'Marked lapsed', ended: 'Registration period over', current: 'Registration current', unknown: 'Registered' };

export function BuilderCityView({ b, city, others = [] }: { b: BuilderDetail; city: Place; others?: (Place & { projects: number })[] }) {
  const path = builderPath(city.slug, b.slug);
  const fromRegister = b.projects.some((p) => p.registerSource);
  const otherNames = b.registeredAs.filter((n) => n !== b.name);
  const elsewhere = b.cities.filter((c) => c.slug !== city.slug);
  // Grouped by locality, so a buyer who knows the area finds it quickly.
  const byLocality = new Map<string, { locality: Place; projects: BuilderDetail['projects'] }>();
  for (const p of b.projects) (byLocality.get(p.locality.slug) ?? byLocality.set(p.locality.slug, { locality: p.locality, projects: [] }).get(p.locality.slug)!).projects.push(p);
  const groups = [...byLocality.values()].sort((x, y) => y.projects.length - x.projects.length || x.locality.name.localeCompare(y.locality.name));
  const all = [...b.projects.map((p) => standing(p.registerStatus, p.registerValidUntil)), ...b.alsoRegistered.map((r) => standing(r.status, r.validUntil))];
  const n = (k: string) => all.filter((x) => x === k).length;
  const total = b.projects.length + b.alsoRegisteredTotal;
  const registerName = b.alsoRegistered[0]?.registerName;
  const standingText = [n('current') ? `${n('current')} ${n('current') === 1 ? 'has a registration that is' : 'have registrations that are'} still running` : '', n('ended') ? `${n('ended')} ${n('ended') === 1 ? 'has' : 'have'} passed the end date of the registration` : '', n('lapsed') ? `${n('lapsed')} ${n('lapsed') === 1 ? 'is' : 'are'} marked lapsed by the register` : ''].filter(Boolean).join(', ');
  const faqs = [
    { q: `How many projects does ${b.name} have in ${city.name}?`, a: `${b.name} has ${count(total)} on the public RERA register for ${city.name}${b.alsoRegisteredTotal ? `: ${b.projects.length} in the localities covered here (${list(groups.map((g) => g.locality.name))}) and ${b.alsoRegisteredTotal} elsewhere in the city` : `, in ${list(groups.map((g) => g.locality.name))}`}.` },
    { q: `Are ${b.name}'s projects in ${city.name} RERA registered?`, a: `Yes, each project listed here has a RERA registration number, shown on this page.${standingText ? ` Of those shown, ${standingText}.` : ''} A registration period that is over often means the project is complete, but confirm this with the builder.` },
    { q: `What do ${b.name} projects in ${city.name} cost?`, a: `The RERA register does not publish prices, so none are shown here until ${b.name} or a seller lists homes. Open a project and request a call back, and our team will find out current prices and availability for you.` },
    ...(otherNames.length ? [{ q: `Which companies register ${b.name}'s projects?`, a: `In ${city.name} they are registered under ${list(b.registeredAs)}. Large builders often register each project under a separate company; the name on your agreement should match the one on the RERA certificate.` }] : []),
  ];
  return (
    <>
      <Breadcrumbs crumbs={[{ name: city.name, path: `/${city.slug}` }, { name: b.name, path }]} />
      <h1>{b.name} projects in {city.name}</h1>
      <p className="lead">
        {b.name} has {count(b.projects.length)} in {city.name} listed here, in {list(groups.map((g) => g.locality.name))}.
        {otherNames.length > 0 && ` ${otherNames.length === 1 ? 'They are registered under the company name' : 'They are registered under these company names:'} ${list(otherNames)}.`}
      </p>
      <TrackRecord name={b.name} place={city.name} r={b.record} />
      <dl className="stats">
        <div><dt>Registered projects in {city.name}</dt><dd>{total}</dd></div>
        <div><dt>Localities</dt><dd>{groups.length}{b.alsoRegisteredTotal ? '+' : ''}</dd></div>
        <div><dt>Registrations still running</dt><dd>{n('current')} of {all.length}</dd></div>
      </dl>
      {fromRegister && <p className="calc-note">Project details come from the public RERA register and have not been confirmed by the builder. The register does not give prices.</p>}

      {groups.map(({ locality, projects }) => (
        <section className="section" key={locality.slug}>
          <h2>{b.name} in <Link href={`/${city.slug}/${locality.slug}`}>{locality.name}</Link></h2>
          <ul className="tiles">
            {projects.map((p) => <ProjectTile key={p.slug} city={city.slug} p={{ ...p, brand: b }} lines={[`${locality.name}, ${city.name}`, [/lapsed/i.test(p.registerStatus ?? '') ? 'RERA registration lapsed' : p.registerValidUntil ? `RERA registration to ${monthYear(p.registerValidUntil)}` : p.reraId ? 'RERA registered' : '', p.homes > 0 ? `${p.homes} ${p.homes === 1 ? 'home' : 'homes'} for sale` : ''].filter(Boolean).join(' · ')]} />)}
          </ul>
        </section>
      ))}

      <section className="section">
        <h2>RERA registration details</h2>
        <div className="atable"><table>
          <thead><tr><th>Project</th><th>Locality</th><th>RERA number</th><th>Registered by</th><th>Registration runs to</th><th>Standing</th></tr></thead>
          <tbody>
            {b.projects.map((p) => (
              <tr key={p.slug}>
                <td><Link href={projectPath(city.slug, { slug: p.slug, brand: b })}>{p.name}</Link></td><td><Link href={`/${city.slug}/${p.locality.slug}`}>{p.locality.name}</Link></td>
                <td>{p.reraId ?? '—'}</td><td>{p.builder}</td><td>{p.registerValidUntil ? monthYear(p.registerValidUntil) : '—'}</td><td>{STANDING[standing(p.registerStatus, p.registerValidUntil)]}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      {b.alsoRegistered.length > 0 && (
        <section className="section">
          <h2>Other {b.name} projects on the {city.name} register</h2>
          <p className="lead">{registerName} also lists {b.alsoRegisteredTotal === 1 ? 'this project' : `these ${b.alsoRegisteredTotal} projects`} for {b.name}. {b.alsoRegisteredTotal === 1 ? 'It is' : 'They are'} outside the localities we cover so far, so {b.alsoRegisteredTotal === 1 ? 'it has' : 'they have'} no page here yet.</p>
          <div className="atable"><table>
            <thead><tr><th>Project</th><th>Location on the register</th><th>RERA number</th><th>Registration runs to</th><th>Standing</th></tr></thead>
            <tbody>
              {b.alsoRegistered.map((r) => (
                <tr key={r.regNo}>
                  <td><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{r.name}</a></td><td>{r.location || '—'}</td><td>{r.regNo}</td>
                  <td>{r.validUntil ? monthYear(r.validUntil) : '—'}</td><td>{STANDING[standing(r.status, r.validUntil)]}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {b.alsoRegisteredTotal > b.alsoRegistered.length && <p className="calc-note">Showing {b.alsoRegistered.length} of {b.alsoRegisteredTotal}.</p>}
        </section>
      )}

      <Faq title={`${b.name} in ${city.name}: common questions`} faqs={faqs} />

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

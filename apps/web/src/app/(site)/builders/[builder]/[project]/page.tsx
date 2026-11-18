import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { AskBox } from '@/components/AskBox';
import { EnquiryForm } from '@/components/EnquiryForm';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { PropertyGrid } from '@/components/PropertyCard';
import { Stats } from '@/components/Stats';
import { api } from '@/lib/api';
import { monthYear, num, price, statusLabel } from '@/lib/format';
import { abs, itemListLd, projectPath } from '@/lib/seo';
import type { ProjectDetail } from '@/lib/types';

type Props = { params: Promise<{ builder: string; project: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await api<ProjectDetail>(`/projects/${(await params).project}`);
  if (!p) return {};
  const title = p.registerSource ? `${p.name}, ${p.locality.name}, ${p.city.name} — RERA Registration and Builder` : `${p.name}, ${p.locality.name}, ${p.city.name} — Price, Floor Plans & Possession`;
  const description = p.registerSource
    ? `${p.name} by ${p.builder} in ${p.locality.name}, ${p.city.name}. RERA registration ${p.reraId}${p.registerValidUntil ? `, valid to ${monthYear(p.registerValidUntil)}` : ''}, from the ${p.registerName} register.`
    : `${p.name} by ${p.builder} in ${p.locality.name}, ${p.city.name}: ${p.bhk.map((b) => `${b.bhk} BHK`).join(', ')} homes${p.stats.count ? ` from ${price(p.stats.minPrice)}` : ''}. ${statusLabel(p.status)}${p.possession ? `, possession ${monthYear(p.possession)}` : ''}.`;
  return { title, description, alternates: { canonical: projectPath(p) }, openGraph: { title, description, url: projectPath(p) } };
}

export default async function ProjectPage({ params }: Props) {
  const { builder, project } = await params;
  const p = await api<ProjectDetail>(`/projects/${project}`);
  if (!p) notFound();
  // One address per project: if the builder in the address is not the project's (it was merged or renamed), go to the right one.
  if (p.brand && p.brand.slug !== builder) permanentRedirect(projectPath(p));
  const localityPath = `/${p.city.slug}/${p.locality.slug}`;
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Builders', path: '/builders' }, ...(p.brand ? [{ name: p.brand.name, path: `/builders/${p.brand.slug}` }] : []), { name: p.name, path: projectPath(p) }]} />
      <h1>{p.name}, {p.locality.name}, {p.city.name}</h1>
      <p className="lead">{p.description}</p>
      {p.registerSource && (
        <div className="astatus">
          <p><strong>From the public RERA register, not yet confirmed by the builder.</strong> These details are as published by {p.registerName}{p.sourceFetchedAt ? `, read on ${new Date(p.sourceFetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}` : ''}. The register does not give prices, floor plans or whether building is finished, so we do not show them. {p.sourceUrl && <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">See the register’s own page</a>}</p>
          {/lapsed/i.test(p.registerStatus ?? '') && <p role="note" className="aerror">The register marks this project’s registration as lapsed. Ask the builder about this before paying anything.</p>}
        </div>
      )}
      {(!p.registerSource || p.stats.count > 0) && <Stats stats={p.stats} />}
      <dl className="detail">
        <div><dt>Builder</dt><dd>{p.brand ? <Link href={`/builders/${p.brand.slug}`}>{p.brand.name}</Link> : p.builder}</dd></div>
        {p.brand && p.brand.name !== p.builder && <div><dt>Registered by</dt><dd>{p.builder}</dd></div>}
        {p.registerSource
          ? <><div><dt>RERA status</dt><dd>{p.registerStatus ?? 'Registered'}</dd></div>{p.registerValidUntil && <div><dt>Registration valid to</dt><dd>{monthYear(p.registerValidUntil)}</dd></div>}</>
          : <><div><dt>Status</dt><dd>{statusLabel(p.status)}</dd></div>{p.possession && <div><dt>Possession</dt><dd>{monthYear(p.possession)}</dd></div>}</>}
        {p.totalUnits != null && <div><dt>Total units</dt><dd>{num(p.totalUnits)}</dd></div>}
        {p.reraId && <div><dt>RERA number</dt><dd>{p.reraId}</dd></div>}
        <div><dt>Locality</dt><dd><Link href={localityPath}>{p.locality.name}</Link>, <Link href={`/${p.city.slug}`}>{p.city.name}</Link></dd></div>
      </dl>

      <section className="section enquiry" id="contact">
        <h2>{p.registerSource ? 'Interested in this project?' : 'Get prices, floor plans and a site visit'}</h2>
        <p>{p.registerSource ? `Leave your details and our team will call you. ${p.builder} has not joined us yet, so we will find out prices and availability for you.` : `Leave your details and the sales team for ${p.name} will call you back.`}</p>
        <EnquiryForm kind="project" slug={p.slug} projectName={p.name} unclaimed={!!p.registerSource} interests={p.bhk.map((b) => `${b.bhk} BHK`)} />
      </section>

      <AskBox context={`${p.locality.name}, ${p.city.name}`} placeholder={`Ask about homes near ${p.name}`} />

      <section className="section">
        <h2>Homes for sale in {p.name}</h2>
        {p.properties.length ? <PropertyGrid items={p.properties} /> : <p>No homes in this project are listed right now. <Link href={localityPath}>See other property in {p.locality.name}</Link>.</p>}
      </section>
      {p.amenities.length > 0 && (
        <section className="section">
          <h2>Amenities</h2>
          <ul className="pills">{p.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      )}

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ApartmentComplex', name: p.name, description: p.description, url: abs(projectPath(p)),
        address: { '@type': 'PostalAddress', addressLocality: `${p.locality.name}, ${p.city.name}`, addressRegion: p.city.state, addressCountry: 'IN' },
        geo: { '@type': 'GeoCoordinates', latitude: p.locality.lat, longitude: p.locality.lng },
        amenityFeature: p.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
      }} />
      {p.properties.length > 0 && <JsonLd data={itemListLd(`Homes for sale in ${p.name}`, p.properties)} />}
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AskBox } from '@/components/AskBox';
import { EnquiryForm } from '@/components/EnquiryForm';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { PropertyGrid } from '@/components/PropertyCard';
import { Stats } from '@/components/Stats';
import { api } from '@/lib/api';
import { monthYear, num, price, statusLabel } from '@/lib/format';
import { abs, itemListLd } from '@/lib/seo';
import type { ProjectDetail } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await api<ProjectDetail>(`/projects/${(await params).slug}`);
  if (!p) return {};
  const title = `${p.name}, ${p.locality.name}, ${p.city.name} — Price, Floor Plans & Possession`;
  const description = `${p.name} by ${p.builder} in ${p.locality.name}, ${p.city.name}: ${p.bhk.map((b) => `${b.bhk} BHK`).join(', ')} homes${p.stats.count ? ` from ${price(p.stats.minPrice)}` : ''}. ${statusLabel(p.status)}${p.possession ? `, possession ${monthYear(p.possession)}` : ''}.`;
  return { title, description, alternates: { canonical: `/projects/${p.slug}` }, openGraph: { title, description, url: `/projects/${p.slug}` } };
}

export default async function ProjectPage({ params }: Props) {
  const p = await api<ProjectDetail>(`/projects/${(await params).slug}`);
  if (!p) notFound();
  const localityPath = `/${p.city.slug}/${p.locality.slug}`;
  return (
    <>
      <Breadcrumbs crumbs={[{ name: p.city.name, path: `/${p.city.slug}` }, { name: p.locality.name, path: localityPath }, { name: p.name, path: `/projects/${p.slug}` }]} />
      <h1>{p.name}, {p.locality.name}, {p.city.name}</h1>
      <p className="lead">{p.description}</p>
      <Stats stats={p.stats} />
      <dl className="detail">
        <div><dt>Builder</dt><dd>{p.builder}</dd></div>
        <div><dt>Status</dt><dd>{statusLabel(p.status)}</dd></div>
        {p.possession && <div><dt>Possession</dt><dd>{monthYear(p.possession)}</dd></div>}
        <div><dt>Total units</dt><dd>{num(p.totalUnits)}</dd></div>
        {p.reraId && <div><dt>RERA number</dt><dd>{p.reraId}</dd></div>}
        <div><dt>Locality</dt><dd><Link href={localityPath}>{p.locality.name}</Link></dd></div>
      </dl>

      <section className="section enquiry" id="contact">
        <h2>Get prices, floor plans and a site visit</h2>
        <p>Leave your details and the sales team for {p.name} will call you back.</p>
        <EnquiryForm kind="project" slug={p.slug} projectName={p.name} interests={p.bhk.map((b) => `${b.bhk} BHK`)} />
      </section>

      <AskBox context={`${p.locality.name}, ${p.city.name}`} placeholder={`Ask about homes near ${p.name}`} />

      <section className="section">
        <h2>Homes for sale in {p.name}</h2>
        {p.properties.length ? <PropertyGrid items={p.properties} /> : <p>No homes in this project are listed right now. <Link href={localityPath}>See other property in {p.locality.name}</Link>.</p>}
      </section>
      <section className="section">
        <h2>Amenities</h2>
        <ul className="pills">{p.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
      </section>

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ApartmentComplex', name: p.name, description: p.description, url: abs(`/projects/${p.slug}`),
        address: { '@type': 'PostalAddress', addressLocality: `${p.locality.name}, ${p.city.name}`, addressRegion: p.city.state, addressCountry: 'IN' },
        geo: { '@type': 'GeoCoordinates', latitude: p.locality.lat, longitude: p.locality.lng },
        amenityFeature: p.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
      }} />
      {p.properties.length > 0 && <JsonLd data={itemListLd(`Homes for sale in ${p.name}`, p.properties)} />}
    </>
  );
}

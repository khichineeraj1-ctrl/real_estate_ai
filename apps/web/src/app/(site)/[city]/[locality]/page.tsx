import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BuilderCityView, builderCityMetadata, loadBuilderCity } from '@/components/pages/BuilderCity';
import { AskBox } from '@/components/AskBox';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { JsonLd } from '@/components/JsonLd';
import { NoHomesYet, PropertyGrid } from '@/components/PropertyCard';
import { Stats } from '@/components/Stats';
import { api } from '@/lib/api';
import { areaFaqs } from '@/lib/faqs';
import { price, statusLabel } from '@/lib/format';
import { comparePath, configSlug, itemListLd, projectPath } from '@/lib/seo';
import type { Listing, LocalityDetail } from '@/lib/types';

type Props = { params: Promise<{ city: string; locality: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, locality } = await params;
  const l = await api<LocalityDetail>(`/localities/${city}/${locality}`);
  if (!l) { const d = await loadBuilderCity(city, locality); return d && 'b' in d ? builderCityMetadata(d.b, d.city) : {}; }
  const path = `/${l.city.slug}/${l.slug}`;
  const none = !l.stats.count;
  const title = none ? `Property in ${l.name}, ${l.city.name} — Projects and Locality Guide` : `Property for Sale in ${l.name}, ${l.city.name} — ${l.stats.count} Homes from ${price(l.stats.minPrice)}`;
  const description = none ? `${l.name}, ${l.city.name}: what the area is known for${l.projects.length ? `, and ${l.projects.length} builder projects from the public RERA register` : ''}.` : `${l.stats.count} flats, villas and plots for sale in ${l.name}, ${l.city.name}. Prices from ${price(l.stats.minPrice)} to ${price(l.stats.maxPrice)}, average ₹${l.stats.avgRate?.toLocaleString('en-IN')} per sq ft.`;
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path } };
}

export default async function LocalityPage({ params }: Props) {
  const { city, locality } = await params;
  const l = await api<LocalityDetail>(`/localities/${city}/${locality}`);
  if (!l) {
    // Not a locality: the same place in the address is used for a builder's projects in this city.
    const d = await loadBuilderCity(city, locality);
    if (!d) notFound();
    if ('movedTo' in d) permanentRedirect(d.movedTo);
    return <BuilderCityView b={d.b} city={d.city} />;
  }
  const path = `/${l.city.slug}/${l.slug}`;
  const place = `${l.name}, ${l.city.name}`;
  const listing = await api<Listing>(`/properties?city=${l.city.slug}&locality=${l.slug}&pageSize=48`);
  const items = listing?.items ?? [];

  return (
    <>
      <Breadcrumbs crumbs={[{ name: l.city.name, path: `/${l.city.slug}` }, { name: l.name, path }]} />
      <h1>Property for sale in {place}</h1>
      <p className="lead">{l.intro}</p>
      <ul className="bullets">{l.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
      <Stats stats={l.stats} />
      <AskBox context={place} placeholder={`Ask about ${l.name}, e.g. 3 BHK ready to move`} />

      {l.bhk.length > 0 && (
        <section className="section">
          <h2>Browse {l.name} by size</h2>
          <ul className="chips left">
            {l.bhk.map((b) => <li key={b.bhk}><Link href={`${path}/${configSlug(b.bhk)}`}>{b.bhk} BHK <small>({b.count}) from {price(b.minPrice)}</small></Link></li>)}
          </ul>
        </section>
      )}

      <section className="section">
        <h2>{items.length ? `${items.length} homes for sale in ${l.name}` : `Homes for sale in ${l.name}`}</h2>
        {items.length ? <PropertyGrid items={items} /> : <NoHomesYet place={l.name} />}
      </section>

      {l.projects.length > 0 && (
        <section className="section">
          <h2>Projects in {l.name}</h2>
          <ul className="tiles">
            {l.projects.map((p) => <li key={p.slug}><Link href={projectPath(l.city.slug, p)}><strong>{p.name}</strong><span>{p.builder}</span><span>{p.registerSource ? 'From the RERA register' : statusLabel(p.status)}</span></Link></li>)}
          </ul>
        </section>
      )}

      <section className="section">
        <h2>Localities near {l.name}</h2>
        <ul className="chips left">{l.nearby.map((n) => <li key={n.slug}><Link href={`/${l.city.slug}/${n.slug}`}>Property in {n.name}</Link></li>)}</ul>
      </section>

      <section className="section">
        <h2>Compare {l.name} with</h2>
        <ul className="chips left">{l.nearby.map((n) => <li key={n.slug}><Link href={comparePath(l.city.slug, l.slug, n.slug)}>{l.name} vs {n.name}</Link></li>)}</ul>
      </section>

      <Faq title={`${l.name} property: common questions`} faqs={areaFaqs(place, l.stats, l.bhk)} />
      <JsonLd data={itemListLd(`Property for sale in ${place}`, items)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Place', name: place, address: { '@type': 'PostalAddress', addressLocality: l.name, addressRegion: l.city.state, addressCountry: 'IN' }, geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } }} />
    </>
  );
}

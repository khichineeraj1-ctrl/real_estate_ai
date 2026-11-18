import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AskBox } from '@/components/AskBox';
import { ConfidenceBadge, ConfidenceReasons } from '@/components/Confidence';
import { EnquiryForm } from '@/components/EnquiryForm';
import { CostCalculator, EmiCalculator } from '@/components/tools/Calculators';
import { CompareToggle } from '@/components/tools/Compare';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { PropertyGrid } from '@/components/PropertyCard';
import { api } from '@/lib/api';
import { day, monthYear, num, price, rate, statusLabel, typeLabel } from '@/lib/format';
import { abs, configSlug, media } from '@/lib/seo';
import { KIND_LABEL } from '@/lib/trust';
import type { PropertyDetail } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

const SCHEMA_TYPE = { APARTMENT: 'Apartment', VILLA: 'House', BUILDER_FLOOR: 'Residence', PLOT: 'Place' } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await api<PropertyDetail>(`/properties/${(await params).slug}`);
  if (!p) return {};
  const title = `${p.title} — ${price(p.priceInr)}, ${num(p.areaSqft)} sq ft`;
  const description = `${p.description} Price ${price(p.priceInr)} (${rate(Math.round(p.priceInr / p.areaSqft))}).`.slice(0, 300);
  return { title, description, alternates: { canonical: `/property/${p.slug}` }, openGraph: { title, description, url: `/property/${p.slug}`, type: 'article', ...(p.photos?.[0] ? { images: [media(p.photos[0].file)] } : {}) } };
}

export default async function PropertyPage({ params }: Props) {
  const p = await api<PropertyDetail>(`/properties/${(await params).slug}`);
  if (!p) notFound();
  const localityPath = `/${p.city.slug}/${p.locality.slug}`;
  const photos = p.photos ?? [];
  const perSqft = Math.round(p.priceInr / p.areaSqft);
  const vsArea = p.localityStats.avgRate ? Math.round(((perSqft - p.localityStats.avgRate) / p.localityStats.avgRate) * 100) : null;
  const address = { '@type': 'PostalAddress', addressLocality: `${p.locality.name}, ${p.city.name}`, addressRegion: p.city.state, addressCountry: 'IN' };

  return (
    <>
      <Breadcrumbs crumbs={[
        { name: p.city.name, path: `/${p.city.slug}` }, { name: p.locality.name, path: localityPath },
        ...(p.bhk ? [{ name: `${p.bhk} BHK`, path: `${localityPath}/${configSlug(p.bhk)}` }] : []),
        { name: p.title.split(' in ')[0], path: `/property/${p.slug}` },
      ]} />
      <h1>{p.title}</h1>
      <p className="price-line">{price(p.priceInr)}<small>{rate(perSqft)}</small></p>
      {vsArea != null && (
        <p className="lead">
          {vsArea === 0 ? 'Priced at' : `${Math.abs(vsArea)}% ${vsArea > 0 ? 'above' : 'below'}`} the average asking rate in <Link href={localityPath}>{p.locality.name}</Link> ({rate(p.localityStats.avgRate)}).
        </p>
      )}

      {photos.length > 0 && (
        <div className={`gallery ${photos.length === 1 ? 'single' : ''}`}>
          {photos.map((ph, i) => (
            // The first photo loads at full size; the rest load small and open the full photo when clicked.
            <a key={ph.file} href={media(ph.file)}><img src={media(ph.file, i === 0 ? 'full' : 'card')} alt={`${p.title} — photo ${i + 1} of ${photos.length}`} width={i === 0 ? ph.width : 640} height={i === 0 ? ph.height : 480} loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} decoding="async" /></a>
          ))}
        </div>
      )}

      <dl className="detail">
        <div><dt>Type</dt><dd>{typeLabel(p.type)}</dd></div>
        {p.bhk > 0 && <div><dt>Bedrooms</dt><dd>{p.bhk} BHK</dd></div>}
        {p.bathrooms > 0 && <div><dt>Bathrooms</dt><dd>{p.bathrooms}</dd></div>}
        <div><dt>Area</dt><dd>{num(p.areaSqft)} sq ft</dd></div>
        {p.floor != null && <div><dt>Floor</dt><dd>{p.floor} of {p.totalFloors}</dd></div>}
        {p.facing && <div><dt>Facing</dt><dd>{p.facing}</dd></div>}
        {p.furnishing && <div><dt>Furnishing</dt><dd>{p.furnishing}</dd></div>}
        <div><dt>Status</dt><dd>{statusLabel(p.status)}</dd></div>
        {p.possession && <div><dt>Possession</dt><dd>{monthYear(p.possession)}</dd></div>}
        {p.project && <div><dt>Project</dt><dd><Link href={`/projects/${p.project.slug}`}>{p.project.name}</Link></dd></div>}
        {p.project?.reraId && <div><dt>RERA number</dt><dd>{p.project.reraId}</dd></div>}
        <div><dt>Listed by</dt><dd>{p.listedBy[0] + p.listedBy.slice(1).toLowerCase()}</dd></div>
        <div><dt>Listed on</dt><dd>{day(p.postedAt)}</dd></div>
      </dl>

      <section className="section trust" id="confidence">
        <h2>How confident can you be? <ConfidenceBadge level={p.confidence.level} /></h2>
        <ConfidenceReasons confidence={p.confidence} />
        {p.seller ? (
          <p>
            Seller: <Link href={`/dealers/${p.seller.id}`} rel="nofollow">{p.seller.firmName ?? p.seller.name}</Link>
            {p.seller.kind ? ` (${KIND_LABEL[p.seller.kind].toLowerCase()})` : ''} — <ConfidenceBadge level={p.seller.confidence.level} />
          </p>
        ) : <p>This home was listed through our team, not by an outside seller.</p>}
        <p className="calc-note">Our checks reduce risk; they are not a guarantee. Before paying anything, see the home yourself and have a lawyer check the title papers{p.status === 'UNDER_CONSTRUCTION' ? ' and the project’s RERA registration' : ''}.</p>
      </section>

      <p className="compare-line">
        <CompareToggle slug={p.slug} title={p.title} />
        {p.similar.length > 0 && <Link href={`/compare?ids=${[p.slug, ...p.similar.slice(0, 2).map((x) => x.slug)].join(',')}`} rel="nofollow">Compare with similar homes in {p.locality.name}</Link>}
      </p>

      <section className="section" id="cost">
        <h2>What will it really cost?</h2>
        {p.costs ? <CostCalculator price={p.priceInr} costs={p.costs} cityName={p.city.name} underConstruction={p.status === 'UNDER_CONSTRUCTION'} /> : <p>We do not have the government charges for {p.city.name} yet.</p>}
      </section>

      <section className="section" id="emi">
        <h2>Monthly EMI for this home</h2>
        <EmiCalculator price={p.priceInr} />
        <p className="calc-note">Not sure about the budget? <Link href="/tools/home-affordability">Work out how much home you can afford</Link>.</p>
      </section>

      <section className="section enquiry" id="contact">
        <h2>Contact the seller</h2>
        <EnquiryForm slug={p.slug} />
      </section>

      <section className="section">
        <h2>About this home</h2>
        <p>{p.description}</p>
        {p.amenities.length > 0 && <ul className="pills">{p.amenities.map((a) => <li key={a}>{a}</li>)}</ul>}
      </section>

      <section className="section">
        <h2>About {p.locality.name}</h2>
        <ul className="bullets">{p.locality.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
        <p><Link href={localityPath}>See all {p.localityStats.count} homes for sale in {p.locality.name}, {p.city.name}</Link></p>
      </section>

      <section className="section">
        <h2>Have a question about this home or the area?</h2>
        <AskBox context={`${p.locality.name}, ${p.city.name}`} placeholder={`Ask about ${p.locality.name}, e.g. similar homes under ${price(p.priceInr)}`} />
      </section>

      {p.similar.length > 0 && (
        <section className="section">
          <h2>Similar homes in {p.locality.name}</h2>
          <PropertyGrid items={p.similar} />
        </section>
      )}

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'RealEstateListing', name: p.title, description: p.description, url: abs(`/property/${p.slug}`), datePosted: p.postedAt,
        ...(photos.length ? { image: photos.map((ph) => abs(media(ph.file))) } : {}),
        mainEntity: {
          '@type': SCHEMA_TYPE[p.type], name: p.title, address, geo: { '@type': 'GeoCoordinates', latitude: p.locality.lat, longitude: p.locality.lng },
          ...(p.type !== 'PLOT' ? {
            numberOfBedrooms: p.bhk, numberOfBathroomsTotal: p.bathrooms,
            floorSize: { '@type': 'QuantitativeValue', value: p.areaSqft, unitCode: 'FTK' },
            amenityFeature: p.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
          } : {}),
        },
        offers: { '@type': 'Offer', price: p.priceInr, priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: abs(`/property/${p.slug}`) },
      }} />
    </>
  );
}

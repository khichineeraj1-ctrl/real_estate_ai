import { Gallery } from '@/components/Gallery';
import { ConnectButton } from '@/components/ConnectButton';
import { ProjectTile } from '@/components/ProjectTile';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AskBox } from '@/components/AskBox';
import { EnquiryForm } from '@/components/EnquiryForm';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { PropertyGrid } from '@/components/PropertyCard';
import { Stats } from '@/components/Stats';
import { api } from '@/lib/api';
import { monthYear, num, price, statusLabel } from '@/lib/format';
import { abs, builderPath, itemListLd, projectPath, pageMeta, media } from '@/lib/seo';
import type { ProjectDetail } from '@/lib/types';

/** A builder's project. Its address is /<city>/<builder>/<project>; the page files decide which address was asked for. */
export const loadProject = (slug: string) => api<ProjectDetail>(`/projects/${slug}`);
const pathOf = (p: ProjectDetail) => projectPath(p.city.slug, p);

export function projectMetadata(p: ProjectDetail): Metadata {
  const title = p.registerSource ? `${p.name}, ${p.locality.name}, ${p.city.name} — RERA Details` : `${p.name}, ${p.locality.name}, ${p.city.name} — Price, Floor Plans & Possession`;
  const description = p.registerSource
    ? `${p.name} by ${p.brand?.name ?? p.builder} in ${p.locality.name}, ${p.city.name}: RERA registration number, ${/lapsed/i.test(p.registerStatus ?? '') ? 'lapsed status' : 'status'}${p.registerValidUntil ? ` and validity (to ${monthYear(p.registerValidUntil)})` : ''}, from the ${p.registerName} register.`
    : `${p.name} by ${p.builder} in ${p.locality.name}, ${p.city.name}: ${p.bhk.map((b) => `${b.bhk} BHK`).join(', ')} homes${p.stats.count ? ` from ${price(p.stats.minPrice)}` : ''}. ${statusLabel(p.status)}${p.possession ? `, possession ${monthYear(p.possession)}` : ''}.`;
  return pageMeta({ title, description, path: pathOf(p), image: p.photos?.[0] ? media(p.photos[0].file) : undefined });
}

export function ProjectView({ p }: { p: ProjectDetail }) {
  const builderHere = p.brand ? builderPath(p.city.slug, p.brand.slug) : null;
  const photos = p.photos ?? [];
  const localityPath = `/${p.city.slug}/${p.locality.slug}`;
  return (
    <>
      <Breadcrumbs crumbs={[{ name: p.city.name, path: `/${p.city.slug}` }, { name: p.locality.name, path: localityPath }, { name: p.name, path: pathOf(p) }]} />
      <h1>{p.name}, {p.locality.name}, {p.city.name}</h1>
      <p className="lead">{p.description}</p>
      <Gallery photos={photos} videos={p.videos ?? []} name={`${p.name}, ${p.locality.name}`} />
      {p.registerSource && (
        <div className="astatus">
          <p><strong>From the public RERA register, not yet confirmed by the builder.</strong> These details are as published by {p.registerName}{p.sourceFetchedAt ? `, read on ${new Date(p.sourceFetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}` : ''}. The register does not give prices, floor plans or whether building is finished, so we do not show them. {p.sourceUrl && <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">See the register’s own page</a>}</p>
          {/lapsed/i.test(p.registerStatus ?? '') && <p role="note" className="aerror">The register marks this project’s registration as lapsed. Ask the builder about this before paying anything.</p>}
        </div>
      )}
      {(!p.registerSource || p.stats.count > 0) && <Stats stats={p.stats} />}
      <dl className="detail">
        <div><dt>Builder</dt><dd>{p.brand && builderHere ? <Link href={builderHere}>{p.brand.name}</Link> : p.builder}</dd></div>
        {p.brand && p.brand.name !== p.builder && <div><dt>Registered by</dt><dd>{p.builder}</dd></div>}
        {p.registerSource
          ? <><div><dt>RERA status</dt><dd>{p.registerStatus ?? 'Registered'}</dd></div>{p.registerValidUntil && <div><dt>Registration valid to</dt><dd>{monthYear(p.registerValidUntil)}</dd></div>}</>
          : <><div><dt>Status</dt><dd>{statusLabel(p.status)}</dd></div>{p.possession && <div><dt>Possession</dt><dd>{monthYear(p.possession)}</dd></div>}</>}
        {p.totalUnits != null && <div><dt>Total units</dt><dd>{num(p.totalUnits)}</dd></div>}
        {p.reraId && <div><dt>RERA number</dt><dd>{p.reraId}</dd></div>}
        <div><dt>Locality</dt><dd><Link href={localityPath}>{p.locality.name}</Link>, <Link href={`/${p.city.slug}`}>{p.city.name}</Link></dd></div>
      </dl>

      {p.agents.length > 0 && (
        <section className="section" id="agents">
          <h2>Verified agents selling {p.name}</h2>
          <p className="lead">We have checked these agents’ identity and registration. Ask to be connected and you will be shown one agent’s number; they will call you as well.</p>
          <ul className="tiles">
            {p.agents.map((a) => (
              <li className="ptile" key={a.id}>
                <Link href={`/dealers/${a.id}`}><strong>{a.name}</strong>{a.firmName && <span>{a.firmName}</span>}<span className="ptile-agents">✓ {a.label}{a.yearsInBusiness ? ` · ${a.yearsInBusiness} years in business` : ''}</span></Link>
              </li>
            ))}
          </ul>
          <p><ConnectButton kind="project" slug={p.slug} name={p.name} mode="agent" agents={p.agents.length} unclaimed={!!p.registerSource} /></p>
        </section>
      )}

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
      {p.brand && p.more.byBuilder.length > 0 && (
        <section className="section">
          <h2>More {p.brand.name} projects in {p.city.name}</h2>
          <ul className="tiles">
            {p.more.byBuilder.map((x) => <ProjectTile key={x.slug} city={p.city.slug} p={x} lines={[`${x.locality?.name}, ${p.city.name}`]} />)}
          </ul>
          {builderHere && <p><Link href={builderHere}>All {p.brand.name} projects in {p.city.name}</Link></p>}
        </section>
      )}
      {p.more.inLocality.length > 0 && (
        <section className="section">
          <h2>Other projects in {p.locality.name}</h2>
          <ul className="tiles">
            {p.more.inLocality.map((x) => <ProjectTile key={x.slug} city={p.city.slug} p={x} lines={[x.brand?.name ?? x.builder]} />)}
          </ul>
          <p><Link href={localityPath}>All projects and property in {p.locality.name}</Link></p>
        </section>
      )}
      {p.amenities.length > 0 && (
        <section className="section">
          <h2>Amenities</h2>
          <ul className="pills">{p.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      )}

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ApartmentComplex', name: p.name, description: p.description, url: abs(pathOf(p)), ...(photos.length ? { image: photos.map((ph) => abs(media(ph.file))) } : {}),
        address: { '@type': 'PostalAddress', addressLocality: `${p.locality.name}, ${p.city.name}`, addressRegion: p.city.state, addressCountry: 'IN' },
        geo: { '@type': 'GeoCoordinates', latitude: p.locality.lat, longitude: p.locality.lng },
        amenityFeature: p.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
      }} />
      {p.properties.length > 0 && <JsonLd data={itemListLd(`Homes for sale in ${p.name}`, p.properties)} />}
    </>
  );
}

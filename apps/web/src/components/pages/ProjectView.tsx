import { Amenities, ProjectUnits } from '@/components/ProjectUnits';
import { CompareToggle } from '@/components/tools/Compare';
import { Checklist } from '@/components/Checklist';
import { SaveButton } from '@/components/account/SaveButton';
import { Follow } from '@/components/Follow';
import { Gallery } from '@/components/Gallery';
import { ConnectButton } from '@/components/ConnectButton';
import { ProjectTile } from '@/components/ProjectTile';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AskBox } from '@/components/AskBox';
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
      <SaveButton kind="project" slug={p.slug} name={p.name} />
      <Gallery photos={photos} videos={p.videos ?? []} name={`${p.name}, ${p.locality.name}`} />
      {p.units.length > 0 && (
        <section className="section section-tight" id="homes-on-offer">
          <h2>Homes on offer in {p.name}</h2>
          <ProjectUnits units={p.units} slug={p.slug} name={p.name} unclaimed={!!p.registerSource} />
        </section>
      )}
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
        {p.totalUnits != null && <div><dt>Total units</dt><dd>{num(p.totalUnits)}{p.declared?.towers ? ` in ${p.declared.towers} tower${p.declared.towers === 1 ? '' : 's'}` : ''}</dd></div>}
        {p.declared?.start && <div><dt>Construction start, as declared</dt><dd>{monthYear(p.declared.start)}</dd></div>}
        {p.declared?.litigation != null && <div><dt>Litigation pending, as declared</dt><dd>{p.declared.litigation ? 'Yes: ask the builder for details' : 'None declared'}</dd></div>}
        {p.reraId && <div><dt>RERA number</dt><dd>{p.reraId}</dd></div>}
        <div><dt>Locality</dt><dd><Link href={localityPath}>{p.locality.name}</Link>, <Link href={`/${p.city.slug}`}>{p.city.name}</Link></dd></div>
      </dl>

      {p.declared && <p className="calc-note">“As declared” means what {p.builder} stated in its registration application to {p.registerName}, read on {new Date(p.declared.readAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}. It was true when the builder applied and has not been checked by us.</p>}

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

      {p.amenityGroups.length > 0 && (
        <section className="section" id="amenities">
          <h2>Amenities</h2>
          <Amenities groups={p.amenityGroups} />
        </section>
      )}

      <section className="section" id="nearby">
        <h2>What is near {p.name}</h2>
        <div className="near">
          <div className="near-map">
            <iframe title={`Map showing ${p.place.exact ? p.name : p.locality.name}`} loading="lazy" referrerPolicy="no-referrer" src={`https://www.openstreetmap.org/export/embed.html?bbox=${p.place.lng - 0.03}%2C${p.place.lat - 0.02}%2C${p.place.lng + 0.03}%2C${p.place.lat + 0.02}&layer=mapnik&marker=${p.place.lat}%2C${p.place.lng}`} />
            <p><a href={`https://www.openstreetmap.org/?mlat=${p.place.lat}&mlon=${p.place.lng}#map=15/${p.place.lat}/${p.place.lng}`} target="_blank" rel="noopener noreferrer nofollow">Open a larger map ↗</a>{!p.place.exact && <span> · The pin is the centre of {p.locality.name}, not the project’s gate.</span>}</p>
          </div>
          {p.place.nearby.length > 0 ? (
            <div className="near-list">
              {p.place.nearby.map((g) => (
                <div key={g.kind} className="near-group">
                  <h3><span aria-hidden="true">{g.icon}</span>{g.label}</h3>
                  <ul>{g.items.map((x) => <li key={x.name}><span>{x.name}</span><b>{x.km < 1 ? `${Math.round(x.km * 1000 / 50) * 50} m` : `${x.km} km`}</b></li>)}</ul>
                </div>
              ))}
              <p className="calc-note">Straight-line distances from {p.place.exact ? 'the project’s pin' : `the centre of ${p.locality.name}`}. The road is always longer, so check the drive at the hour you would travel. Places and map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer nofollow">OpenStreetMap</a> contributors.</p>
            </div>
          ) : <p className="near-none">Distances to the metro, airport and offices will show here once our team has mapped them for {p.city.name}. Meanwhile, <Link href={localityPath}>see {p.locality.name}</Link>.</p>}
        </div>
      </section>

      <Checklist slug={p.slug} name={p.name} items={p.checklist} />
      {p.registerSource && <Follow slug={p.slug} name={p.name} />}

      <section className="section compare-cta">
        <h2>How does {p.name} compare?</h2>
        <p>Put it next to other projects and see where they differ: who is building, how the RERA registration stands, verified agents and homes for sale.</p>
        <p className="compare-line"><CompareToggle kind="projects" slug={p.slug} title={p.name} />{[...p.more.inLocality, ...p.more.byBuilder].slice(0, 4).length > 0 && <span className="compare-hint">or open a comparison:</span>}</p>
        {[...p.more.inLocality, ...p.more.byBuilder].slice(0, 4).length > 0 && (
          <ul className="chips left">
            {[...p.more.inLocality, ...p.more.byBuilder].slice(0, 4).map((x) => <li key={x.slug}><Link href={`/compare/projects?ids=${p.slug},${x.slug}`} rel="nofollow">{p.name} vs {x.name}</Link></li>)}
          </ul>
        )}
      </section>

      <section className="section enquiry enquiry-cta" id="contact">
        <div>
          <h2>{p.registerSource ? 'Interested in this project?' : 'Get prices, floor plans and a site visit'}</h2>
          <p>{p.registerSource ? 'Our team will call you with prices and availability.' : `The sales team for ${p.name} will call you back.`}</p>
        </div>
        <ConnectButton kind="project" slug={p.slug} name={p.name} mode="callback" unclaimed={!!p.registerSource} full interests={p.bhk.map((b) => `${b.bhk} BHK`)} />
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

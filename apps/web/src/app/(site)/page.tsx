import type { Metadata } from 'next';
import Link from 'next/link';
import { AskBox } from '@/components/AskBox';
import { KIND_ICON, KIND_PLURAL, type Places } from '@/components/land/cards';
import { Upcoming, type UpcomingItem } from '@/components/Upcoming';
import { Launches, type Launch } from '@/components/Launches';
import { CompareStudio } from '@/components/tools/CompareStudio';
import { JsonLd } from '@/components/JsonLd';
import { PropertyGrid } from '@/components/PropertyCard';
import { api } from '@/lib/api';
import { price } from '@/lib/format';
import { BRAND, SITE_URL, TAGLINE, abs, pageMeta, builderPath } from '@/lib/seo';
import type { CitySummary, Listing, BuilderSummary } from '@/lib/types';

export const metadata: Metadata = {
  ...pageMeta({ title: `${BRAND} — ${TAGLINE}`, description: 'Ask by typing or by voice and get a direct answer about homes and RERA-registered builder projects in Gurgaon, Bengaluru, Mumbai and Pune.', path: '/' }),
  title: { absolute: `${BRAND} — ${TAGLINE}` },
};

// Short enough to sit on one line under the box.
const EXAMPLES = ['3 BHK in Whitefield', 'M3M projects in Gurgaon', 'Average rate in Powai?', 'Cheapest 2 BHK in Pune'];

export default async function Home() {
  const [cities, latest, builders, stages, launches, upcoming, land] = await Promise.all([api<CitySummary[]>('/cities'), api<Listing>('/properties?pageSize=6'), api<BuilderSummary[]>('/builders'), api<{ key: string; title: string; guides: { slug: string; short: string; summary: string; icon: string; minutes: number; accent: string }[] }[]>('/guide-stages'), api<{ total: number; months: number; items: Launch[] }>('/launches'), api<{ notice: string; items: UpcomingItem[] }>('/upcoming', { revalidate: 60 }), api<Places>('/land/places', { revalidate: 60 })]);
  const topBuilders = [...(builders ?? [])].sort((a, b) => b.projects - a.projects || a.name.localeCompare(b.name)).slice(0, 12);
  return (
    <>
      <section className="hero">
        <h1>Ask. Find your home.<span>Homes and builder projects in Gurgaon, Bengaluru, Mumbai and Pune</span></h1>
        <AskBox autoFocus placeholder="Type or speak, e.g. 3 BHK in Whitefield" />
        <ul className="chips" aria-label="Example questions">
          {EXAMPLES.map((q) => <li key={q}><Link href={`/ask?q=${encodeURIComponent(q)}`} rel="nofollow">{q}</Link></li>)}
        </ul>
      </section>

      {launches && launches.items.length > 0 && (
        <section className="section" id="new-launches">
          <h2>New launches</h2>
          <Launches items={launches.items} total={launches.total} months={launches.months} />
        </section>
      )}

      {upcoming && upcoming.items.length > 0 && (
        <section className="section" id="upcoming">
          <h2>Upcoming projects</h2>
          <Upcoming items={upcoming.items} notice={upcoming.notice} />
        </section>
      )}

      <section className="section land-home" id="land">
        <div className="know-head">
          <div><h2>Land, plots and warehouses, across India</h2><p className="lead">Beyond the big cities: farm land, plots, industrial land and space for warehouses and dark stores.</p></div>
          <Link className="launch-all" href="/land">See all →</Link>
        </div>
        <ul className="land-kinds">
          {(land?.kinds ?? []).map((k) => (
            <li key={k.kind}><Link href={`/land?kind=${k.kind}#listings`} className={`kind-${k.kind.toLowerCase()}`}><span aria-hidden="true">{KIND_ICON[k.kind]}</span><strong>{KIND_PLURAL[k.kind] ?? k.label}</strong><em>{k.count ? `${k.count} listed` : 'List yours'}</em></Link></li>
          ))}
        </ul>
        <p className="land-home-acts"><Link className="abtn" href="/land/post">List your land free</Link><Link className="abtn quiet" href="/land/wanted/post">Company? Post what you need</Link>{land?.wanted ? <Link href="/land/wanted">{land.wanted} open requirement{land.wanted === 1 ? '' : 's'} →</Link> : null}</p>
      </section>

      <section className="section usp">
        <h2>Compare before you decide</h2>
        <p className="lead">Pick two projects, areas or homes and see them side by side.</p>
        <CompareStudio compact cities={(cities ?? []).map((c) => ({ slug: c.slug, name: c.name, localities: c.localities.map((l) => ({ slug: l.slug, name: l.name })) }))} />
      </section>

      {(stages?.length ?? 0) > 0 && (
        <section className="section" id="guides">
          <div className="know-head">
            <div><h2>Know before you buy</h2><p className="lead">Seven short guides, in the order you will need them. A few minutes each.</p></div>
            <Link className="launch-all" href="/guides">All guides →</Link>
          </div>
          <ul className="know">
            {stages!.flatMap((st, n) => st.guides.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="know-card" style={{ '--accent': g.accent } as React.CSSProperties}>
                  <span className="know-step">Step {n + 1} · {st.title}</span>
                  <span className="know-icon" aria-hidden="true">{g.icon}</span>
                  <strong>{g.short}</strong>
                  <span className="know-sum">{g.summary}</span>
                  <b aria-hidden="true">{g.minutes} min read <i>→</i></b>
                </Link>
              </li>
            )))}
          </ul>
        </section>
      )}

      <section className="section">
        <h2>Browse property by city</h2>
        <ul className="tiles">
          {(cities ?? []).map((c) => (
            <li key={c.slug}>
              <Link href={`/${c.slug}`}>
                <strong>Property in {c.name}</strong>
                <span>{c.stats.count ? `${c.stats.count} homes · from ${price(c.stats.minPrice)}` : `${c.localities.length} localities · builder projects`}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {(cities ?? []).map((c) => (
        <section className="section" key={c.slug}>
          <h2>Popular localities in {c.name}</h2>
          <ul className="chips left">
            {c.localities.map((l) => <li key={l.slug}><Link href={`/${c.slug}/${l.slug}`}>{l.name}</Link></li>)}
          </ul>
        </section>
      ))}

      {topBuilders.length > 0 && (
        <section className="section">
          <h2>Projects by builder</h2>
          <ul className="chips left">
            {topBuilders.flatMap((b) => b.cities.map((c) => <li key={`${b.slug}-${c.slug}`}><Link href={builderPath(c.slug, b.slug)}>{b.name} projects in {c.name}</Link></li>))}
            <li><Link href="/builders">All {builders!.length} builders</Link></li>
          </ul>
        </section>
      )}


      <section className="section">
        <h2>Work out the money</h2>
        <ul className="chips left">
          <li><Link href="/tools/emi-calculator">Home loan EMI calculator</Link></li>
          <li><Link href="/tools/home-affordability">How much home can I afford?</Link></li>
          <li><Link href="/tools/cost-of-buying">Stamp duty and registration calculator</Link></li>
        </ul>
      </section>

      {(latest?.items.length ?? 0) > 0 && (
        <section className="section">
          <h2>Newly listed homes</h2>
          <PropertyGrid items={latest!.items} />
        </section>
      )}

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, description: TAGLINE, url: SITE_URL, inLanguage: 'en-IN',
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${abs('/ask')}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
      }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: SITE_URL }} />
    </>
  );
}

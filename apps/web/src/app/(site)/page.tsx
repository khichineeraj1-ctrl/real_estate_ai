import type { Metadata } from 'next';
import Link from 'next/link';
import { AskBox } from '@/components/AskBox';
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

const EXAMPLES = ['3 BHK in Whitefield under 1.5 crore', 'Ready to move flats in Sector 57 Gurgaon', 'What is the average rate in Powai?', 'Cheapest 2 BHK in Pune', 'Villas in Bengaluru above 3 crore'];

export default async function Home() {
  const [cities, latest, builders] = await Promise.all([api<CitySummary[]>('/cities'), api<Listing>('/properties?pageSize=6'), api<BuilderSummary[]>('/builders')]);
  const topBuilders = [...(builders ?? [])].sort((a, b) => b.projects - a.projects || a.name.localeCompare(b.name)).slice(0, 12);
  return (
    <>
      <section className="hero">
        <h1>Ask. Find your home.<span>Property and builder projects in Gurgaon, Bengaluru, Mumbai and Pune</span></h1>
        <p className="lead">Type or speak your question and get a straight answer, with the matching homes and builder projects.</p>
        <AskBox autoFocus />
        <ul className="chips" aria-label="Example questions">
          {EXAMPLES.map((q) => <li key={q}><Link href={`/ask?q=${encodeURIComponent(q)}`} rel="nofollow">{q}</Link></li>)}
        </ul>
      </section>

      <section className="section usp">
        <h2>Compare before you decide</h2>
        <p className="lead">Put projects, areas or homes side by side and see where they differ. Where a fact is not known, we say so instead of leaving it out.</p>
        <ul className="tools">
          <li><Link href="/compare"><em>Which project is on firmer ground?</em><strong>Builder projects</strong><span>RERA registration and how it stands, the builder’s other projects, and agents we have verified.</span><b aria-hidden="true">Compare projects <i>→</i></b></Link></li>
          <li><Link href="/compare#localities"><em>Which area suits me?</em><strong>Localities</strong><span>Asking rates, what is for sale by size, and what each area is known for.</span><b aria-hidden="true">Compare localities <i>→</i></b></Link></li>
          <li><Link href="/compare"><em>Which of these homes is better?</em><strong>Homes</strong><span>Price against the area, the full cost with stamp duty, and the monthly EMI.</span><b aria-hidden="true">Compare homes <i>→</i></b></Link></li>
        </ul>
      </section>

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

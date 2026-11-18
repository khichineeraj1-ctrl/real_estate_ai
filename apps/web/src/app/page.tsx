import Link from 'next/link';
import { AskBox } from '@/components/AskBox';
import { JsonLd } from '@/components/JsonLd';
import { PropertyGrid } from '@/components/PropertyCard';
import { api } from '@/lib/api';
import { price } from '@/lib/format';
import { BRAND, SITE_URL, TAGLINE, abs } from '@/lib/seo';
import type { CitySummary, Listing } from '@/lib/types';

export const metadata = { alternates: { canonical: '/' } };

const EXAMPLES = ['3 BHK in Whitefield under 1.5 crore', 'Ready to move flats in Sector 57 Gurgaon', 'What is the average rate in Powai?', 'Cheapest 2 BHK in Pune', 'Villas in Bengaluru above 3 crore'];

export default async function Home() {
  const [cities, latest] = await Promise.all([api<CitySummary[]>('/cities'), api<Listing>('/properties?pageSize=6')]);
  return (
    <>
      <section className="hero">
        <h1>Ask. Find your home.</h1>
        <p className="lead">Type or speak your question and get a straight answer with matching homes in Gurgaon, Bengaluru, Mumbai and Pune.</p>
        <AskBox autoFocus />
        <ul className="chips" aria-label="Example questions">
          {EXAMPLES.map((q) => <li key={q}><Link href={`/ask?q=${encodeURIComponent(q)}`} rel="nofollow">{q}</Link></li>)}
        </ul>
      </section>

      <section className="section">
        <h2>Browse property by city</h2>
        <ul className="tiles">
          {(cities ?? []).map((c) => (
            <li key={c.slug}>
              <Link href={`/${c.slug}`}>
                <strong>Property in {c.name}</strong>
                <span>{c.stats.count} homes · from {price(c.stats.minPrice)}</span>
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

      <section className="section">
        <h2>Newly listed homes</h2>
        <PropertyGrid items={latest?.items ?? []} />
      </section>

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, description: TAGLINE, url: SITE_URL, inLanguage: 'en-IN',
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${abs('/ask')}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
      }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: SITE_URL }} />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AskBox } from '@/components/AskBox';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { JsonLd } from '@/components/JsonLd';
import { NoHomesYet, PropertyGrid } from '@/components/PropertyCard';
import { Stats } from '@/components/Stats';
import { api } from '@/lib/api';
import { areaFaqs } from '@/lib/faqs';
import { price, statusLabel } from '@/lib/format';
import { itemListLd, projectPath } from '@/lib/seo';
import type { CityDetail, Listing } from '@/lib/types';

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await api<CityDetail>(`/cities/${slug}`);
  if (!city) return {};
  const none = !city.stats.count;
  const title = none ? `Property in ${city.name} — Localities and RERA-Registered Projects` : `Property for Sale in ${city.name} — ${city.stats.count} Flats, Villas & Plots`;
  const description = none ? `Explore ${city.localities.length} localities of ${city.name}, ${city.state}, and ${city.projects.length} builder projects taken from the public RERA register.` : `${city.stats.count} homes for sale in ${city.name}, ${city.state}, from ${price(city.stats.minPrice)} to ${price(city.stats.maxPrice)}. Compare ${city.localities.length} localities, prices per sq ft and new projects.`;
  return { title, description, alternates: { canonical: `/${city.slug}` }, openGraph: { title, description, url: `/${city.slug}` } };
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params;
  const city = await api<CityDetail>(`/cities/${slug}`);
  if (!city) notFound();
  const listing = await api<Listing>(`/properties?city=${city.slug}&pageSize=12`);
  const items = listing?.items ?? [];
  const cheapest = [...city.localities].filter((l) => l.stats.avgRate).sort((a, b) => a.stats.avgRate! - b.stats.avgRate!)[0];
  const faqs = areaFaqs(city.name, city.stats, city.bhk, cheapest ? [{ q: `Which is the most affordable locality in ${city.name}?`, a: `Among the localities listed here, ${cheapest.name} has the lowest average asking rate at ₹${cheapest.stats.avgRate!.toLocaleString('en-IN')} per sq ft.` }] : []);

  return (
    <>
      <Breadcrumbs crumbs={[{ name: city.name, path: `/${city.slug}` }]} />
      <h1>Property for sale in {city.name}</h1>
      <p className="lead">{city.intro}</p>
      <Stats stats={city.stats} />
      <AskBox context={city.name} placeholder={`Ask about ${city.name}, e.g. 2 BHK under 1 crore`} />

      <section className="section">
        <h2>Localities in {city.name}</h2>
        <ul className="tiles">
          {city.localities.map((l) => (
            <li key={l.slug}>
              <Link href={`/${city.slug}/${l.slug}`}>
                <strong>{l.name}</strong>
                {l.stats.count > 0 && <span>{l.stats.count} homes · from {price(l.stats.minPrice)}</span>}
                {l.stats.avgRate != null && <span>Avg ₹{l.stats.avgRate.toLocaleString('en-IN')}/sq ft</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Latest homes for sale in {city.name}</h2>
        {items.length ? <PropertyGrid items={items} /> : <NoHomesYet place={city.name} />}
      </section>

      <section className="section">
        <h2>Projects in {city.name}</h2>
        <ul className="tiles">
          {city.projects.map((p) => (
            <li key={p.slug}><Link href={projectPath(p)}><strong>{p.name}</strong><span>{p.locality?.name} · {p.builder}</span><span>{p.registerSource ? 'From the RERA register' : statusLabel(p.status)}</span></Link></li>
          ))}
        </ul>
      </section>

      <Faq title={`Buying property in ${city.name}: common questions`} faqs={faqs} />
      <JsonLd data={itemListLd(`Property for sale in ${city.name}`, items)} />
    </>
  );
}

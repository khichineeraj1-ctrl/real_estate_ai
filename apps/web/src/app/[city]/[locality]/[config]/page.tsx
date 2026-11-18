import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AskBox } from '@/components/AskBox';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { JsonLd } from '@/components/JsonLd';
import { PropertyGrid } from '@/components/PropertyCard';
import { Stats } from '@/components/Stats';
import { api } from '@/lib/api';
import { price, rate } from '@/lib/format';
import { configSlug, itemListLd, parseConfig } from '@/lib/seo';
import type { Listing, LocalityDetail } from '@/lib/types';

type Props = { params: Promise<{ city: string; locality: string; config: string }> };

async function load(params: Props['params']) {
  const { city, locality, config } = await params;
  const bhk = parseConfig(config);
  if (!bhk) return null;
  const l = await api<LocalityDetail>(`/localities/${city}/${locality}`);
  if (!l) return null;
  const listing = await api<Listing>(`/properties?city=${l.city.slug}&locality=${l.slug}&bhk=${bhk}&pageSize=48&sort=price_asc`);
  // A size nobody is selling here is a 404, not an empty page for search engines to index.
  if (!listing || listing.total === 0) return null;
  return { l, bhk, listing, path: `/${l.city.slug}/${l.slug}/${configSlug(bhk)}`, place: `${l.name}, ${l.city.name}` };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  const s = d.listing.stats;
  const title = `${d.bhk} BHK Flats for Sale in ${d.place} — ${s.count} from ${price(s.minPrice)}`;
  const description = `${s.count} ${d.bhk} BHK flats and homes for sale in ${d.place}, priced ${price(s.minPrice)} to ${price(s.maxPrice)} (average ${rate(s.avgRate)}).`;
  return { title, description, alternates: { canonical: d.path }, openGraph: { title, description, url: d.path } };
}

export default async function ConfigPage({ params }: Props) {
  const d = await load(params);
  if (!d) notFound();
  const { l, bhk, listing, path, place } = d;
  const s = listing.stats;
  const base = `/${l.city.slug}/${l.slug}`;
  return (
    <>
      <Breadcrumbs crumbs={[{ name: l.city.name, path: `/${l.city.slug}` }, { name: l.name, path: base }, { name: `${bhk} BHK`, path }]} />
      <h1>{bhk} BHK flats for sale in {place}</h1>
      <p className="lead">{s.count} {bhk} BHK {s.count === 1 ? 'home' : 'homes'} in {l.name}, priced from {price(s.minPrice)} to {price(s.maxPrice)}, cheapest first.</p>
      <Stats stats={s} />
      <AskBox context={`${bhk} BHK in ${place}`} placeholder={`Ask about ${bhk} BHK homes in ${l.name}`} />

      <section className="section">
        <h2>{bhk} BHK homes in {l.name}</h2>
        <PropertyGrid items={listing.items} />
      </section>

      <section className="section">
        <h2>Other sizes in {l.name}</h2>
        <ul className="chips left">
          {l.bhk.filter((b) => b.bhk !== bhk).map((b) => <li key={b.bhk}><Link href={`${base}/${configSlug(b.bhk)}`}>{b.bhk} BHK <small>({b.count})</small></Link></li>)}
          <li><Link href={base}>All property in {l.name}</Link></li>
        </ul>
      </section>

      <Faq title={`${bhk} BHK in ${l.name}: common questions`} faqs={[
        { q: `What is the price of a ${bhk} BHK flat in ${place}?`, a: `${bhk} BHK homes in ${place} are listed from ${price(s.minPrice)} to ${price(s.maxPrice)}, at an average of ${rate(s.avgRate)}.` },
        { q: `How many ${bhk} BHK flats are for sale in ${place}?`, a: `${s.count} ${bhk} BHK ${s.count === 1 ? 'home is' : 'homes are'} listed in ${place} right now.` },
      ]} />
      <JsonLd data={itemListLd(`${bhk} BHK flats for sale in ${place}`, listing.items)} />
    </>
  );
}

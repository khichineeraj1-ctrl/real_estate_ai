import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { OtherTools } from '@/components/tools/OtherTools';
import { QuoteCompare } from '@/components/tools/Quotes';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { CitySummary } from '@/lib/types';

const title = 'True Price Calculator — Carpet Area Rate & Builder Quote Comparison';
const description = 'Enter a builder’s quote and see what you really pay per carpet sq ft with parking, club, GST, stamp duty and registration. Compare up to three quotes.';
export const metadata: Metadata = pageMeta({ title, description, path: '/tools/true-price' });

export default async function TruePricePage() {
  const cities = ((await api<CitySummary[]>('/cities')) ?? []).filter((c) => c.costs);
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }, { name: 'True price of a quote', path: '/tools/true-price' }]} />
      <h1>What does this quote really cost?</h1>
      <p className="lead">Type in a builder’s quote. See the price per sq ft you can actually use, and the whole bill. Add a second quote to compare.</p>
      <QuoteCompare cities={cities.map((c) => ({ slug: c.slug, name: c.name, costs: c.costs }))} />
      <Faq title="Carpet area and quotes: common questions" faqs={[
        { q: 'What is carpet area?', a: 'The floor inside your flat that you can lay a carpet on: the rooms, kitchen, bathrooms and internal passages, inside the walls. RERA defines it and requires homes to be sold on it.' },
        { q: 'What is super built-up area and loading?', a: 'Super built-up area adds your share of walls, lobbies, stairs, lifts and sometimes the clubhouse to the carpet area. “Loading” is the share of the super built-up area that is not carpet, commonly 20% to 40%. Two flats quoted at the same rate can differ a lot in usable floor.' },
        { q: 'Which charges do builders add to the basic price?', a: 'Commonly parking, club membership, preferred-location and floor-rise charges, a maintenance deposit, and legal or documentation fees, then GST on an under-construction home, and stamp duty and registration paid to the state. Ask for all of them on one sheet before you book.' },
        { q: 'How do I compare two quotes fairly?', a: 'Compare the whole bill divided by the carpet area. The quote with the lower rate per super built-up sq ft is often not the cheaper one once loading and extras are counted.' },
      ]} />
      <OtherTools current="/tools/true-price" />
    </>
  );
}

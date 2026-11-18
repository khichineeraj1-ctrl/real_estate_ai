import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BRAND } from '@/lib/seo';

const title = 'Home Buying Tools — EMI, Affordability, Total Cost and Comparisons';
const description = `Free tools from ${BRAND} to help you decide: work out your EMI, how much home you can afford, the full cost including stamp duty and GST, and compare homes and localities side by side.`;
export const metadata: Metadata = { title, description, alternates: { canonical: '/tools' }, openGraph: { title, description, url: '/tools' } };

const TOOLS = [
  { href: '/tools/emi-calculator', name: 'EMI calculator', text: 'The monthly instalment on a home loan, and how much interest you pay over its life.' },
  { href: '/tools/home-affordability', name: 'How much home can I afford?', text: 'A budget from your income, existing EMIs and savings.' },
  { href: '/tools/cost-of-buying', name: 'True cost of buying', text: 'Stamp duty, registration and GST on top of the listed price, by city.' },
  { href: '/compare', name: 'Compare homes', text: 'Up to four listings side by side: price, rate, size, costs and amenities.' },
];

export default function Tools() {
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }]} />
      <h1>Tools to help you decide</h1>
      <p className="lead">Buying a home is mostly arithmetic and comparison. These do the arithmetic, so you can spend your time on the comparison.</p>
      <ul className="tiles">
        {TOOLS.map((t) => <li key={t.href}><Link href={t.href}><strong>{t.name}</strong><span>{t.text}</span></Link></li>)}
      </ul>
      <p className="section">To compare two areas, open any locality page and choose one of the nearby localities under “Compare”.</p>
    </>
  );
}

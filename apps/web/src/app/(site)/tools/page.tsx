import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LocalityPicker, QuickLook } from '@/components/tools/Hub';
import { api } from '@/lib/api';
import { BRAND } from '@/lib/seo';
import type { CitySummary } from '@/lib/types';

const title = 'Home Buying Tools — EMI, Affordability, Total Cost and Comparisons';
const description = `Free tools from ${BRAND} to help you decide: work out your EMI, how much home you can afford, the full cost including stamp duty and GST, and compare homes and localities side by side.`;
export const metadata: Metadata = { title, description, alternates: { canonical: '/tools' }, openGraph: { title, description, url: '/tools' } };

/* Small line drawings, one per tool. They take the text colour, so they work in light and dark. */
const ICONS = {
  emi: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 7h8M8 12h2M12 12h4M8 16h2M12 16h4" /></>,
  afford: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /><path d="M10 13h4M10 13c3 0 3 3.5 0 3.5l3 3" /></>,
  cost: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  compare: <><rect x="3" y="5" width="7.5" height="14" rx="2" /><rect x="13.5" y="5" width="7.5" height="14" rx="2" /><path d="M5.5 9h2.5M16 9h2.5M5.5 13h2.5M16 13h2.5" /></>,
};

const TOOLS = [
  { href: '/tools/emi-calculator', icon: ICONS.emi, name: 'EMI calculator', text: 'The monthly instalment on a home loan, and how much interest you pay over its life.', ask: 'What will I pay each month?' },
  { href: '/tools/home-affordability', icon: ICONS.afford, name: 'How much home can I afford?', text: 'A budget from your income, existing EMIs and savings.', ask: 'What is my budget?' },
  { href: '/tools/cost-of-buying', icon: ICONS.cost, name: 'True cost of buying', text: 'Stamp duty, registration and GST on top of the listed price, by city.', ask: 'What will I pay beyond the price?' },
  { href: '/compare', icon: ICONS.compare, name: 'Compare homes', text: 'Up to four listings side by side: price, rate, size, costs and amenities.', ask: 'Which of these homes is better?' },
];

export default async function Tools() {
  const cities = (await api<CitySummary[]>('/cities')) ?? [];
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }]} />
      <h1>Tools to help you decide</h1>
      <p className="lead">Buying a home is mostly arithmetic and comparison. These do the arithmetic, so you can spend your time on the comparison.</p>

      <QuickLook />

      <ul className="tools">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href}>
              <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
              <em>{t.ask}</em>
              <strong>{t.name}</strong>
              <span>{t.text}</span>
              <b aria-hidden="true">Open <i>→</i></b>
            </Link>
          </li>
        ))}
      </ul>

      <LocalityPicker cities={cities.map((c) => ({ slug: c.slug, name: c.name, localities: (c.localities ?? []).map((l) => ({ slug: l.slug, name: l.name })) }))} />
    </>
  );
}

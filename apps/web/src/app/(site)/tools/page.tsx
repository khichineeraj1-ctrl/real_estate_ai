import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CompareStudio } from '@/components/tools/CompareStudio';
import { QuickLook } from '@/components/tools/Hub';
import { api } from '@/lib/api';
import { BRAND, pageMeta } from '@/lib/seo';
import type { CitySummary } from '@/lib/types';

const title = 'Home Buying Tools — EMI, Affordability & Cost Calculators';
const description = `Free tools from ${BRAND}: work out your EMI, how much home you can afford and the full cost with stamp duty and GST, and compare homes and localities.`;
export const metadata: Metadata = pageMeta({ title, description, path: '/tools' });

/* Small line drawings, one per tool. They take the text colour, so they work in light and dark. */
const ICONS = {
  emi: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 7h8M8 12h2M12 12h4M8 16h2M12 16h4" /></>,
  afford: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /><path d="M10 13h4M10 13c3 0 3 3.5 0 3.5l3 3" /></>,
  quote: <><path d="M4 20V8l8-5 8 5v12" /><path d="M9 20v-6h6v6" /><path d="M9 10h6" /></>,
  delay: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 3h6" /></>,
  area: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h4M3 15h4M9 21v-4M15 21v-4M9 3v2M15 3v2" /></>,
  cost: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
};

const TOOLS = [
  { href: '/tools/emi-calculator', icon: ICONS.emi, name: 'EMI calculator', ask: 'What will I pay each month?' },
  { href: '/tools/home-affordability', icon: ICONS.afford, name: 'How much can I afford?', ask: 'What is my budget?' },
  { href: '/tools/cost-of-buying', icon: ICONS.cost, name: 'True cost of buying', ask: 'Stamp duty, registration and GST' },
  { href: '/tools/true-price', icon: ICONS.quote, name: 'True price of a quote', ask: 'Per carpet sq ft, and compare quotes' },
  { href: '/tools/delay-cost', icon: ICONS.delay, name: 'Cost of a delay', ask: 'If possession runs late' },
  { href: '/tools/land-area', icon: ICONS.area, name: 'Land area converter', ask: 'Acres, hectares, gaj, guntha, kanal' },
];

export default async function Tools() {
  const cities = (await api<CitySummary[]>('/cities')) ?? [];
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }]} />
      <h1>Tools to help you decide</h1>
      <p className="lead">Slide to a price and see what it means for you.</p>

      <QuickLook />

      <ul className="tools tools-row">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href}>
              <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
              <span className="tool-text"><strong>{t.name}</strong><em>{t.ask}</em></span>
              <b aria-hidden="true"><i>→</i></b>
            </Link>
          </li>
        ))}
      </ul>

      <section className="section">
        <h2>Compare side by side</h2>
        <CompareStudio compact cities={cities.map((c) => ({ slug: c.slug, name: c.name, localities: (c.localities ?? []).map((l) => ({ slug: l.slug, name: l.name })) }))} />
      </section>
    </>
  );
}

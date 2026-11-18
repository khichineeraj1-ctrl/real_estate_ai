import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { CostCalculator } from '@/components/tools/Calculators';
import { api } from '@/lib/api';
import { GST } from '@/lib/finance';
import type { CitySummary } from '@/lib/types';

const title = 'True Cost of Buying a Home — Stamp Duty, Registration and GST Calculator';
const description = 'Estimate what a home costs beyond the listed price: stamp duty, registration fee and GST in Gurgaon, Bengaluru, Mumbai and Pune.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/tools/cost-of-buying' }, openGraph: { title, description, url: '/tools/cost-of-buying' } };

export default async function CostPage() {
  const cities = ((await api<CitySummary[]>('/cities')) ?? []).filter((c) => c.costs);
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }, { name: 'True cost of buying', path: '/tools/cost-of-buying' }]} />
      <h1>The true cost of buying a home</h1>
      <p className="lead">The listed price is not what you pay. The government’s charges add several percent, and they differ by city and by whether the home is finished.</p>
      <CostCalculator cities={cities.map((c) => ({ slug: c.slug, name: c.name, costs: c.costs }))} />

      <section className="section">
        <h2>Rates used</h2>
        <div className="atable"><table>
          <thead><tr><th>City</th><th>Stamp duty</th><th>If in a woman’s name</th><th>Registration fee</th><th>Checked by our team</th></tr></thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.slug}>
                <td><Link href={`/${c.slug}`}>{c.name}</Link></td><td>{c.costs!.stampDutyPct}%</td><td>{c.costs!.stampDutyWomenPct}%</td>
                <td>{c.costs!.registrationPct}%{c.costs!.registrationCapInr != null ? `, at most ₹${c.costs!.registrationCapInr.toLocaleString('en-IN')}` : ''}</td>
                <td>{c.costs!.reviewedAt ? new Date(c.costs!.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Not yet'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="calc-note">GST is taken as {GST.pct}% of the price for a home bought while under construction ({GST.affordablePct}% up to ₹{(GST.affordableUpToInr / 100000).toFixed(0)} lakh, which also has a size limit not checked here), and none for a ready home. All figures are estimates; governments change these rates, and duty is charged on the higher of the price and the official circle rate.</p>
      </section>

      <Faq title="Buying costs: common questions" faqs={[
        { q: 'What is stamp duty?', a: 'A state tax paid when a property is transferred to your name. It is a percentage of the price or of the government’s circle rate for the area, whichever is higher, and it varies by state, by city, and in some states by whether the buyer is a woman.' },
        { q: 'Is there GST on a ready-to-move flat?', a: 'No. GST applies only when you buy a home that is still under construction. Once the building has its completion certificate, there is no GST on the sale.' },
        { q: 'Can a home loan pay for stamp duty and registration?', a: 'Usually not. Lenders finance a share of the property’s price, so plan to pay these charges from your own savings, together with the down payment.' },
      ]} />
    </>
  );
}

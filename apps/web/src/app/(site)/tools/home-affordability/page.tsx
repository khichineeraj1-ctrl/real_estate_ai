import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { AffordabilityCalculator } from '@/components/tools/Calculators';

const title = 'How Much Home Can I Afford? — Home Budget Calculator';
const description = 'Find a realistic home budget from your monthly income, the EMIs you already pay and your savings for the down payment.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/tools/home-affordability' }, openGraph: { title, description, url: '/tools/home-affordability' } };

export default function AffordabilityPage() {
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }, { name: 'How much can I afford?', path: '/tools/home-affordability' }]} />
      <h1>How much home can I afford?</h1>
      <p className="lead">A budget based on what a lender would usually let you repay each month, plus what you have saved.</p>
      <AffordabilityCalculator />
      <p>Remember the charges on top of the price: see the <Link href="/tools/cost-of-buying">true cost of buying</Link>. Then <Link href="/ask">ask for homes in your budget</Link>.</p>
      <Faq title="Affordability: common questions" faqs={[
        { q: 'How do banks decide how much they will lend?', a: 'Mainly from your income and existing debts. Lenders commonly allow all your loan instalments together to take about 40% to 50% of your take-home pay. They also look at your credit score, age, and the value of the home, and usually lend up to 75% to 90% of the price.' },
        { q: 'How much should I keep for the down payment?', a: 'Plan for at least 10% to 25% of the price as your own money, plus stamp duty, registration and other charges, which a home loan does not cover. A larger down payment means a smaller loan and less interest.' },
        { q: 'Is the budget shown here a loan offer?', a: 'No. It is an estimate from the numbers you enter. A lender will assess your documents and may offer more or less.' },
      ]} />
    </>
  );
}

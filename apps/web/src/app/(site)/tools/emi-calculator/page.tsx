import { OtherTools } from '@/components/tools/OtherTools';
import { pageMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { EmiCalculator } from '@/components/tools/Calculators';
import { LOAN_DEFAULTS, loanPlan } from '@/lib/finance';
import { price } from '@/lib/format';

const title = 'Home Loan EMI Calculator — Monthly EMI & Total Interest';
const description = 'Work out the monthly EMI on a home loan from the price, down payment, interest rate and loan period, and see how much interest you pay in total.';
export const metadata: Metadata = pageMeta({ title, description, path: '/tools/emi-calculator' });

export default function EmiPage() {
  const example = loanPlan(10_000_000, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years);
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }, { name: 'EMI calculator', path: '/tools/emi-calculator' }]} />
      <h1>Home loan EMI calculator</h1>
      <p className="lead">Enter the price of the home and how you plan to pay for it. The instalment updates as you type.</p>
      <EmiCalculator />
      <p>Every property page on this site has the same calculator filled in with that home’s price. Next: <Link href="/tools/home-affordability">how much home can I afford?</Link> or the <Link href="/tools/cost-of-buying">true cost of buying</Link>.</p>
      <Faq title="EMI: common questions" faqs={[
        { q: 'How is a home loan EMI calculated?', a: 'An EMI is a fixed monthly payment that covers the interest for the month and repays part of the loan. It depends on three things: the amount borrowed, the interest rate, and the number of months. Early instalments are mostly interest; later ones mostly repay the loan.' },
        { q: `What is the EMI on a ₹1 crore home?`, a: `With a ${LOAN_DEFAULTS.downPct}% down payment, the loan is ${price(example.loan)}. At an example rate of ${LOAN_DEFAULTS.ratePct}% over ${LOAN_DEFAULTS.years} years the EMI is about ₹${example.monthly.toLocaleString('en-IN')} a month, and the interest over the whole period is about ${price(example.interest)}. Your bank’s rate will differ.` },
        { q: 'Does a longer loan period cost more?', a: 'Yes. A longer period lowers the monthly instalment but you pay interest for more years, so the total interest is higher. Try 15 and 25 years in the calculator to see the difference.' },
      ]} />
      <OtherTools current="/tools/emi-calculator" />
    </>
  );
}

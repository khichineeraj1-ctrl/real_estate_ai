import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { OtherTools } from '@/components/tools/OtherTools';
import { DelayCalculator } from '@/components/tools/Quotes';
import { pageMeta } from '@/lib/seo';

const title = 'Possession Delay Cost Calculator — What a Late Home Costs You';
const description = 'See what a delay in possession costs: the extra rent you pay, rent and EMI together each month, and the interest the builder owes you under RERA.';
export const metadata: Metadata = pageMeta({ title, description, path: '/tools/delay-cost' });

export default function DelayCostPage() {
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }, { name: 'Cost of a delay', path: '/tools/delay-cost' }]} />
      <h1>What would a delay in possession cost you?</h1>
      <p className="lead">Slide to a delay and see the extra rent, what the builder would owe you, and what is left for you to bear.</p>
      <DelayCalculator />
      <Faq title="Delayed possession: common questions" faqs={[
        { q: 'What can I claim if possession is late?', a: 'Under RERA, if the builder misses the possession date in your agreement you may either stay in the project and be paid interest for every month of delay on the amount you have paid, or withdraw and get your money back with interest.' },
        { q: 'What is the interest rate for delay?', a: 'Each state’s rules set it; commonly it is the State Bank of India’s highest marginal cost of lending rate plus 2%. The same rate applies to you if you pay an instalment late. Check the rate written in your agreement.' },
        { q: 'How do I know a project’s promised date?', a: 'The end date of its RERA registration is the completion date the builder gave the authority. We show it on every project page that comes from a register, and your agreement should name a possession date no later than it.' },
        { q: 'How can I judge the risk of delay before booking?', a: 'Look at the builder’s track record: how many of its other registered projects are past their date or marked lapsed. Each builder page here shows that count from the public register.' },
      ]} />
      <OtherTools current="/tools/delay-cost" />
    </>
  );
}

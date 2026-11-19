import Link from 'next/link';

const TOOLS = [
  { href: '/tools/emi-calculator', name: 'Home loan EMI calculator' },
  { href: '/tools/home-affordability', name: 'How much home can I afford?' },
  { href: '/tools/cost-of-buying', name: 'Stamp duty, registration and GST calculator' },
  { href: '/tools/true-price', name: 'True price of a builder’s quote' },
  { href: '/tools/delay-cost', name: 'What a possession delay costs' },
];

/** Links from one tool to the others and on to the places a buyer goes next. */
export function OtherTools({ current }: { current: string }) {
  return (
    <section className="section">
      <h2>More tools for home buyers</h2>
      <ul className="chips left">
        {TOOLS.filter((t) => t.href !== current).map((t) => <li key={t.href}><Link href={t.href}>{t.name}</Link></li>)}
        <li><Link href="/tools">All tools</Link></li>
        <li><Link href="/guides">Home buying guides</Link></li>
        <li><Link href="/builders">Builders and their projects</Link></li>
      </ul>
    </section>
  );
}

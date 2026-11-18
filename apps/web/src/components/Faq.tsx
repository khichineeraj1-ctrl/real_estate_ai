import { faqLd } from '@/lib/seo';
import { JsonLd } from './JsonLd';

/** The questions are shown on the page as well as in structured data: search engines ignore FAQ markup for hidden text. */
export function Faq({ title, faqs }: { title: string; faqs: { q: string; a: string }[] }) {
  if (!faqs.length) return null;
  return (
    <section className="section">
      <h2>{title}</h2>
      <dl className="faq">
        {faqs.map((f) => (<div key={f.q}><dt>{f.q}</dt><dd>{f.a}</dd></div>))}
      </dl>
      <JsonLd data={faqLd(faqs)} />
    </section>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { JsonLd } from '@/components/JsonLd';
import { api } from '@/lib/api';
import { BRAND, abs, pageMeta } from '@/lib/seo';
import type { GuideCard } from '../page';

interface Guide extends GuideCard {
  takeaways: string[]; sections: { heading: string; paras: string[]; bullets?: string[] }[];
  tool?: { href: string; label: string }; faqs: { q: string; a: string }[]; reviewed: string; more: GuideCard[];
}
type Props = { params: Promise<{ slug: string }> };
export const revalidate = 3600;
export async function generateStaticParams() { return ((await api<GuideCard[]>('/guides')) ?? []).map((g) => ({ slug: g.slug })); }
const load = async (params: Props['params']) => api<Guide>(`/guides/${(await params).slug}`, { revalidate: 3600 });
const anchor = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await load(params);
  return g ? pageMeta({ title: g.title, description: g.summary, path: `/guides/${g.slug}` }) : {};
}

export default async function GuidePage({ params }: Props) {
  const g = await load(params);
  if (!g) notFound();
  const reviewed = new Date(g.reviewed).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <article className="guide">
      <Breadcrumbs crumbs={[{ name: 'Guides', path: '/guides' }, { name: g.short, path: `/guides/${g.slug}` }]} />
      <h1>{g.title}</h1>
      <p className="lead">{g.summary}</p>
      <p className="guide-meta"><span aria-hidden="true">{g.icon}</span> {g.minutes} minute read · Reviewed {reviewed}</p>

      <aside className="guide-take" aria-label="In short">
        <h2>In short</h2>
        <ul>{g.takeaways.map((t) => <li key={t}>{t}</li>)}</ul>
      </aside>

      <nav className="guide-toc" aria-label="On this page">
        {g.sections.map((s) => <a key={s.heading} href={`#${anchor(s.heading)}`}>{s.heading}</a>)}
      </nav>

      {g.sections.map((s) => (
        <section key={s.heading} id={anchor(s.heading)} className="guide-part">
          <h2>{s.heading}</h2>
          {s.paras.map((p) => <p key={p}>{p}</p>)}
          {s.bullets && <ul>{s.bullets.map((b) => { const [head, ...rest] = b.split(': '); return <li key={b}>{rest.length ? <><strong>{head}:</strong> {rest.join(': ')}</> : b}</li>; })}</ul>}
        </section>
      ))}

      {g.tool && (
        <aside className="guide-tool">
          <div><strong>Put this to use</strong><span>Our calculator does the arithmetic for your own figures.</span></div>
          <Link className="abtn" href={g.tool.href}>{g.tool.label} →</Link>
        </aside>
      )}

      <Faq title="Common questions" faqs={g.faqs} />

      <section className="section">
        <h2>More guides</h2>
        <ul className="chips left">{g.more.map((m) => <li key={m.slug}><Link href={`/guides/${m.slug}`}>{m.icon} {m.short}</Link></li>)}<li><Link href="/tools">Buyer tools</Link></li></ul>
      </section>
      <p className="calc-note">General information about buying a home in India, not legal advice. Laws and rates change and differ by state; have your own lawyer read your papers before you pay or sign.</p>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.summary, dateModified: g.reviewed, inLanguage: 'en-IN', mainEntityOfPage: abs(`/guides/${g.slug}`), author: { '@type': 'Organization', name: BRAND }, publisher: { '@type': 'Organization', name: BRAND } }} />
    </article>
  );
}

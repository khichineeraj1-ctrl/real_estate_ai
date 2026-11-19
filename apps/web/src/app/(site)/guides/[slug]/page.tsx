import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GuideNav } from '@/components/GuideNav';
import { JsonLd } from '@/components/JsonLd';
import { api } from '@/lib/api';
import { BRAND, abs, faqLd, pageMeta } from '@/lib/seo';
import { ArticlePage, articlePath, type Article } from '@/components/ArticlePage';
import type { GuideCard } from '../page';

interface Guide extends GuideCard {
  takeaways: string[]; stats: { value: string; label: string }[]; sections: { heading: string; paras: string[]; bullets?: string[] }[];
  tool?: { href: string; label: string }; faqs: { q: string; a: string }[]; reviewed: string;
  stageInfo?: { step: string; title: string }; prev: GuideCard | null; next: GuideCard | null; more: GuideCard[];
}
type Props = { params: Promise<{ slug: string }> };
export const revalidate = 3600;
export async function generateStaticParams() { return ((await api<GuideCard[]>('/guides')) ?? []).map((g) => ({ slug: g.slug })); }
const load = async (params: Props['params']) => api<Guide>(`/guides/${(await params).slug}`, { revalidate: 3600 });
/** A guide a writer wrote, when the address is not one of the guides built into the product. */
const written = async (params: Props['params']) => { const a = await api<Article>(`/articles/${(await params).slug}`, { revalidate: 300 }); return a?.kind === 'GUIDE' ? a : null; };
const anchor = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tint = (accent: string) => ({ '--accent': accent } as React.CSSProperties);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await load(params);
  if (g) return pageMeta({ title: g.title, description: g.summary, path: `/guides/${g.slug}` });
  const a = await written(params);
  return a ? pageMeta({ title: a.title, description: a.summary, path: articlePath(a) }) : {};
}

export default async function GuidePage({ params }: Props) {
  const g = await load(params);
  if (!g) { const a = await written(params); if (!a) notFound(); return <ArticlePage a={a} />; }
  const reviewed = new Date(g.reviewed).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const sections = g.sections.map((s) => ({ ...s, id: anchor(s.heading) }));
  return (
    <article className="guide" style={tint(g.accent)}>
      <Breadcrumbs crumbs={[{ name: 'Guides', path: '/guides' }, { name: g.short, path: `/guides/${g.slug}` }]} />
      <header className="guide-hero">
        <div className="guide-hero-text">
          {g.stageInfo && <p className="guide-stage"><Link href={`/guides#${g.stage}`}>{g.stageInfo.step} · {g.stageInfo.title}</Link></p>}
          <h1>{g.title}</h1>
          <p className="guide-sum">{g.summary}</p>
          <p className="guide-meta">{g.minutes} minute read · Reviewed {reviewed}</p>
        </div>
        <span className="guide-hero-art" aria-hidden="true">{g.icon}</span>
      </header>

      <ul className="guide-stats">
        {(g.stats ?? []).map((s) => <li key={s.label}><strong>{s.value}</strong><span>{s.label}</span></li>)}
      </ul>

      <div className="guide-cols">
        <GuideNav sections={sections.map((s) => ({ id: s.id, heading: s.heading }))} />
        <div className="guide-body">
          <aside className="guide-take" aria-label="In short">
            <h2>In short</h2>
            <ul>{g.takeaways.map((t) => <li key={t}>{t}</li>)}</ul>
          </aside>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="guide-part">
              <h2><span aria-hidden="true">{i + 1}</span>{s.heading}</h2>
              {s.paras.map((p) => <p key={p}>{p}</p>)}
              {s.bullets && <ul className="guide-points">{s.bullets.map((b) => { const [head, ...rest] = b.split(': '); return <li key={b}>{rest.length ? <><strong>{head}</strong><span>{rest.join(': ')}</span></> : <span>{b}</span>}</li>; })}</ul>}
            </section>
          ))}

          {g.tool && (
            <aside className="guide-tool">
              <div><strong>Put this to use</strong><span>Our calculator does the arithmetic for your own figures.</span></div>
              <Link className="abtn" href={g.tool.href}>{g.tool.label} →</Link>
            </aside>
          )}

          <section className="guide-part" id="questions">
            <h2><span aria-hidden="true">?</span>Common questions</h2>
            <div className="guide-faq">
              {g.faqs.map((f, i) => <details key={f.q} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </div>
            <JsonLd data={faqLd(g.faqs)} />
          </section>

          <nav className="guide-next" aria-label="Other guides">
            {g.prev ? <Link href={`/guides/${g.prev.slug}`} style={tint(g.prev.accent)}><small>← Previous</small><strong>{g.prev.icon} {g.prev.short}</strong></Link> : <span />}
            {g.next ? <Link href={`/guides/${g.next.slug}`} className="is-next" style={tint(g.next.accent)}><small>Next →</small><strong>{g.next.icon} {g.next.short}</strong></Link> : <Link href="/guides" className="is-next"><small>Finished →</small><strong>All guides</strong></Link>}
          </nav>
          <p className="calc-note">General information about buying a home in India, not legal advice. Laws and rates change and differ by state; have your own lawyer read your papers before you pay or sign.</p>
        </div>
      </div>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.summary, dateModified: g.reviewed, inLanguage: 'en-IN', mainEntityOfPage: abs(`/guides/${g.slug}`), author: { '@type': 'Organization', name: BRAND }, publisher: { '@type': 'Organization', name: BRAND } }} />
    </article>
  );
}

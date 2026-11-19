import Link from 'next/link';
import { ArticleBody, headingId, parseArticle } from '@/components/ArticleBody';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GuideNav } from '@/components/GuideNav';
import { JsonLd } from '@/components/JsonLd';
import { BRAND, abs } from '@/lib/seo';

export interface ArticleCard { slug: string; kind: 'GUIDE' | 'BLOG'; title: string; summary: string; minutes: number; by: string | null; publishedAt: string | null }
export interface Article extends ArticleCard { body: string; updatedAt: string; more: ArticleCard[] }
export const articlePath = (a: { kind: string; slug: string }) => `/${a.kind === 'GUIDE' ? 'guides' : 'blog'}/${a.slug}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

/** A guide or blog post written by one of our writers, laid out like the guides: hero, contents rail, the piece, more to read. */
export function ArticlePage({ a }: { a: Article }) {
  const guide = a.kind === 'GUIDE';
  const home = guide ? { name: 'Guides', path: '/guides' } : { name: 'Blog', path: '/blog' };
  const sections = parseArticle(a.body).filter((b) => b.kind === 'h').map((b) => ({ id: headingId((b as { text: string }).text), heading: (b as { text: string }).text }));
  return (
    <article className="guide" style={{ '--accent': guide ? '#4f46e5' : '#0f766e' } as React.CSSProperties}>
      <Breadcrumbs crumbs={[home, { name: a.title, path: articlePath(a) }]} />
      <header className="guide-hero">
        <div className="guide-hero-text">
          <p className="guide-stage"><Link href={home.path}>{guide ? 'Guide' : 'Blog'}</Link></p>
          <h1>{a.title}</h1>
          <p className="guide-sum">{a.summary}</p>
          <p className="guide-meta">{a.by ? `By ${a.by} · ` : ''}{day(a.publishedAt)} · {a.minutes} minute read</p>
        </div>
        <span className="guide-hero-art" aria-hidden="true">{guide ? '📖' : '📰'}</span>
      </header>
      <div className={sections.length > 1 ? 'guide-cols' : 'guide-cols is-plain'}>
        {sections.length > 1 && <GuideNav sections={sections} />}
        <div className="guide-body">
          <ArticleBody body={a.body} />
          {a.more.length > 0 && (
            <nav className="guide-more" aria-label="More to read">
              <h2>More to read</h2>
              <ul className="acards">{a.more.map((m) => <li key={m.slug}><Link href={articlePath(m)}><strong>{m.title}</strong><span>{m.summary}</span><b>{m.minutes} min read →</b></Link></li>)}</ul>
            </nav>
          )}
          <p className="calc-note">General information for home buyers in India, not legal or financial advice. Laws and rates change and differ by state.</p>
        </div>
      </div>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': guide ? 'Article' : 'BlogPosting', headline: a.title, description: a.summary, datePublished: a.publishedAt, dateModified: a.updatedAt, inLanguage: 'en-IN', mainEntityOfPage: abs(articlePath(a)), author: a.by ? { '@type': 'Person', name: a.by } : { '@type': 'Organization', name: BRAND }, publisher: { '@type': 'Organization', name: BRAND } }} />
    </article>
  );
}

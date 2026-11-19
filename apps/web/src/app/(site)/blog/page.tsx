import type { Metadata } from 'next';
import Link from 'next/link';
import { type ArticleCard } from '@/components/ArticlePage';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

export const revalidate = 300;
export const metadata: Metadata = pageMeta({ title: 'Blog — Notes for Home Buyers', description: 'What we are learning about buying a home in India: new launches, RERA, prices and what to check, written by our team.', path: '/blog' });
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

export default async function Blog() {
  const posts = (await api<ArticleCard[]>('/articles?kind=BLOG', { revalidate: 300 })) ?? [];
  const [first, ...rest] = posts;
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Blog', path: '/blog' }]} />
      <h1>Blog</h1>
      <p className="lead">Notes for home buyers, from our team.</p>
      {!first ? <p className="empty">Nothing published yet. Meanwhile, the <Link href="/guides">home buying guides</Link> cover the essentials.</p> : (
        <>
          <Link href={`/blog/${first.slug}`} className="post-lead">
            <span className="post-tag">Latest</span>
            <strong>{first.title}</strong>
            <span>{first.summary}</span>
            <small>{first.by ? `${first.by} · ` : ''}{day(first.publishedAt)} · {first.minutes} min read</small>
          </Link>
          {rest.length > 0 && <ul className="acards">{rest.map((p) => <li key={p.slug}><Link href={`/blog/${p.slug}`}><strong>{p.title}</strong><span>{p.summary}</span><b>{p.by ? `${p.by} · ` : ''}{day(p.publishedAt)} · {p.minutes} min →</b></Link></li>)}</ul>}
        </>
      )}
      <p className="section"><Link href="/guides">Home buying guides</Link> · <Link href="/tools">Buyer tools</Link></p>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PURPOSE_ICON, ago, type WantedItem } from '@/components/land/cards';
import { ReplyButton } from '@/components/land/forms';
import { api } from '@/lib/api';
import { price } from '@/lib/format';
import { pageMeta } from '@/lib/seo';

type Detail = WantedItem & { closed: boolean };
type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';
const load = async (params: Props['params']) => api<Detail>(`/land/wanted/${encodeURIComponent((await params).slug)}`, { revalidate: 60 });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = await load(params);
  if (!w) return {};
  return pageMeta({ title: `Wanted: ${w.size} of ${w.kindLabel.toLowerCase()} in ${w.state} for a ${w.purposeLabel.toLowerCase()}`, description: `${w.title}. Own something that fits? Answer free.`, path: `/land/wanted/${w.slug}`, noindex: w.closed });
}

export default async function WantedPage({ params }: Props) {
  const w = await load(params);
  if (!w) notFound();
  const facts: [string, string][] = [
    ['For', w.purposeLabel], ['Needs', w.kindLabel], ['Size', w.size], ['To', w.deal === 'LEASE' ? 'Take on rent' : 'Buy'],
    ['Where', `${w.where ? `${w.where}, ` : 'Anywhere in '}${w.state}`],
    ...(w.budgetInr ? [['Budget', `Up to ${price(w.budgetInr)}${w.deal === 'LEASE' ? ' a month' : ''}`] as [string, string]] : []),
    ['Posted by', `${w.by ?? 'A company (name kept private)'}, ${ago(w.createdAt).toLowerCase()}`],
  ];
  return (
    <article className="land-page">
      <Breadcrumbs crumbs={[{ name: 'Land', path: '/land' }, { name: 'Wanted', path: '/land/wanted' }, { name: w.purposeLabel, path: `/land/wanted/${w.slug}` }]} />
      <div className="land-top want">
        <span className="land-top-icon" aria-hidden="true">{PURPOSE_ICON[w.purpose] ?? '📍'}</span>
        <div>
          <p className="land-tags"><span>Wanted</span><span>{w.purposeLabel}</span>{w.closed && <span className="closed">Closed</span>}</p>
          <h1>{w.size} of {w.kindLabel.toLowerCase()} wanted {w.deal === 'LEASE' ? 'on rent' : 'to buy'}</h1>
          <p className="land-where">{w.where ? `${w.where}, ` : ''}{w.state}</p>
        </div>
      </div>
      {!w.closed && (
        <div className="land-ask">
          <div><strong>Do you have something that fits?</strong><p>Tell us what you have. Our team passes it on and calls you back.{w.answers ? ` ${w.answers} owner${w.answers === 1 ? ' has' : 's have'} answered so far.` : ''}</p></div>
          <ReplyButton type="wanted" slug={w.slug} label="I have land like this" sent="Our team will pass this on and call you." />
        </div>
      )}
      {w.details && <section className="section"><h2>What it must have</h2><p>{w.details}</p></section>}
      <section className="section"><h2>The requirement</h2><dl className="land-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>
      <p className="section"><Link href="/land/wanted">All requirements</Link> · <Link href="/land/post">List your land so buyers find it</Link></p>
    </article>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ConfidenceBadge, ConfidenceReasons } from '@/components/Confidence';
import { api } from '@/lib/api';
import { KIND_LABEL, type PublicDealer } from '@/lib/trust';

type Props = { params: Promise<{ id: string }> };

// About a named person, so it is kept out of search engines.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await api<PublicDealer>(`/dealers/${encodeURIComponent((await params).id)}`, { revalidate: 60 });
  return { title: d ? `${d.firmName ?? d.name}: how far we have verified this seller` : 'Seller', robots: { index: false, follow: false } };
}

export default async function DealerPage({ params }: Props) {
  const { id } = await params;
  const d = await api<PublicDealer>(`/dealers/${encodeURIComponent(id)}`, { revalidate: 60 });
  if (!d) notFound();
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Seller', path: `/dealers/${d.id}` }]} />
      <h1>{d.firmName ?? d.name}</h1>
      <p className="lead">
        {d.firmName ? `${d.name} · ` : ''}{d.kind ? `${KIND_LABEL[d.kind]} · ` : ''}With us since {new Date(d.since).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
        {d.yearsInBusiness != null ? ` · ${d.yearsInBusiness} years in business (as told to us)` : ''}
      </p>
      <section className="section trust">
        <h2>How far we have verified this seller <ConfidenceBadge level={d.confidence.level} /></h2>
        <ConfidenceReasons confidence={d.confidence} />
        <p className="calc-note">Our checks reduce risk; they are not a guarantee. Whoever you buy from, see the home, have a lawyer check the title papers, and pay nothing before that.</p>
      </section>
      {d.about && <section className="section"><h2>In their words</h2><p>{d.about}</p></section>}
      {d.cities.length > 0 && <p>Works in: {d.cities.join(', ')}.</p>}
      <p><Link href="/ask">Ask for homes</Link> and we show the ones we have most confidence in first.</p>
    </>
  );
}

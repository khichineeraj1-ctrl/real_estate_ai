import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Gallery } from '@/components/Gallery';
import { KIND_ICON, LandGrid, ago, landPrice, roadText, type LandItem } from '@/components/land/cards';
import { ReplyButton } from '@/components/land/forms';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

type Detail = LandItem & { description: string | null; closed: boolean; features: string[]; clearHeightFt: number | null; powerKva: number | null; docks: number | null; checks: { key: string; title: string; why: string }[]; nearby: LandItem[] };
type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';
const load = async (params: Props['params']) => api<Detail>(`/land/listing/${encodeURIComponent((await params).slug)}`, { revalidate: 60 });
const USE: Record<string, string> = { AGRICULTURAL: 'Agricultural', RESIDENTIAL: 'Residential', COMMERCIAL: 'Commercial', INDUSTRIAL: 'Industrial' };
const POSTER: Record<string, string> = { OWNER: 'The owner', DEALER: 'A dealer', COMPANY: 'A company' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await load(params);
  if (!l) return {};
  const t = l.title.charAt(0).toUpperCase() + l.title.slice(1);
  return pageMeta({ title: `${t}, ${l.state}`, description: `${t}, ${l.state}. ${landPrice(l)}${l.rate ? ` (${l.rate})` : ''}. ${roadText(l)}`.trim(), path: `/land/listing/${l.slug}`, noindex: l.closed });
}

export default async function LandListing({ params }: Props) {
  const l = await load(params);
  if (!l) notFound();
  const road = roadText(l);
  const facts: [string, string][] = [
    ['Size', l.areaAlso ? `${l.area} (about ${l.areaAlso})` : l.area],
    [l.deal === 'LEASE' ? 'Rent' : 'Asking price', landPrice(l)],
    ...(l.rate ? [['That works out to', l.rate] as [string, string]] : []),
    ...(l.roadFt ? [['Road in front', `${l.roadFt} ft wide`] as [string, string]] : []),
    ...(l.highway ? [['Nearest main road', `${l.highway}${l.highwayKm != null ? `, ${l.highwayKm} km away` : ''}`] as [string, string]] : []),
    ...(l.kind !== 'BUILT' ? [['Land use, as the poster says', l.landUse ? USE[l.landUse] : 'Not stated: ask'] as [string, string]] : []),
    ...(l.clearHeightFt ? [['Clear height', `${l.clearHeightFt} ft`] as [string, string]] : []),
    ...(l.powerKva ? [['Power load', `${l.powerKva} kVA`] as [string, string]] : []),
    ...(l.docks != null ? [['Loading docks', String(l.docks)] as [string, string]] : []),
    ['Listed by', `${POSTER[l.posterIs] ?? 'The owner'}, ${ago(l.createdAt).toLowerCase()}`],
  ];
  return (
    <article className="land-page">
      <Breadcrumbs crumbs={[{ name: 'Land', path: '/land' }, { name: l.state, path: `/land/${l.stateSlug}` }, { name: l.district, path: `/land/${l.stateSlug}/${l.districtSlug}` }, { name: l.place, path: `/land/listing/${l.slug}` }]} />
      <div className={`land-top kind-${l.kind.toLowerCase()}`}>
        <span className="land-top-icon" aria-hidden="true">{KIND_ICON[l.kind]}</span>
        <div>
          <p className="land-tags"><span>{l.kindLabel}</span><span className={l.deal === 'LEASE' ? 'rent' : ''}>{l.deal === 'LEASE' ? 'For rent' : 'For sale'}</span>{l.closed && <span className="closed">No longer available</span>}</p>
          <h1>{l.title.charAt(0).toUpperCase() + l.title.slice(1)}</h1>
          <p className="land-where">{l.place}, {l.district}, {l.state}</p>
        </div>
      </div>

      {l.photos.length > 0 && <div className="land-gallery"><Gallery photos={l.photos} name={l.title} /></div>}

      <div className="land-stats">
        <div><small>Size</small><strong>{l.area}</strong>{l.areaAlso && <span>about {l.areaAlso}</span>}</div>
        <div><small>{l.deal === 'LEASE' ? 'Rent' : 'Price'}</small><strong>{landPrice(l)}</strong>{l.rate && <span>{l.rate}</span>}</div>
        {road && <div><small>Road</small><strong>{l.roadFt ? `${l.roadFt} ft` : l.highway}</strong>{l.highway && l.roadFt ? <span>{l.highwayKm != null ? `${l.highwayKm} km from ` : 'near '}{l.highway}</span> : null}</div>}
      </div>

      {!l.closed && (
        <div className="land-ask">
          <div><strong>Interested in this {l.kind === 'BUILT' ? 'space' : 'land'}?</strong><p>Send your number. Our team speaks to the {l.posterIs === 'OWNER' ? 'owner' : 'lister'} and calls you back.</p></div>
          <ReplyButton type="listing" slug={l.slug} label="Ask about this" sent="Our team will call you after speaking to the lister." />
        </div>
      )}

      {l.description && <section className="section"><h2>In the lister’s words</h2><p>{l.description}</p></section>}
      {l.features.length > 0 && <ul className="land-feats">{l.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>}

      <section className="section">
        <h2>Details</h2>
        <dl className="land-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <p className="calc-note">Everything here is as told to us by the lister. We check that a listing is genuine and complete, but we have not seen the ownership papers or measured the land{l.photos.length ? ', and the photos are the lister’s own' : ''}.</p>
      </section>

      <section className="section">
        <h2>Before you pay anything</h2>
        <p className="lead">{l.checks.length} things to check for this {l.kind === 'BUILT' ? 'space' : 'land'}. The rules differ from state to state, so treat these as questions to ask, and take a local lawyer’s advice before a large payment.</p>
        <ol className="land-checks">{l.checks.map((c, i) => <li key={c.key}><i>{i + 1}</i><div><strong>{c.title}</strong><p>{c.why}</p></div></li>)}</ol>
      </section>

      {l.nearby.length > 0 && <section className="section"><h2>More in {l.district}</h2><LandGrid items={l.nearby} /></section>}
      <p className="section"><Link href={`/land/${l.stateSlug}/${l.districtSlug}`}>All land in {l.district}</Link> · <Link href="/land/wanted">What companies are looking for</Link> · <Link href="/land/post">List your own land</Link></p>
    </article>
  );
}

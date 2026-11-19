import Link from 'next/link';
import { price } from '@/lib/format';
import { media } from '@/lib/seo';

export interface LandItem {
  slug: string; kind: string; deal: string; title: string; kindLabel: string; state: string; stateSlug: string; district: string; districtSlug: string; place: string;
  area: string; areaAlso: string | null; rate: string | null; priceInr: number | null; roadFt: number | null; highway: string | null; highwayKm: number | null; landUse: string | null; posterIs: string; createdAt: string; photos: { file: string; width: number; height: number }[];
}
export interface WantedItem {
  slug: string; kind: string; deal: string; purpose: string; purposeLabel: string; kindLabel: string; title: string; details: string | null; state: string; stateSlug: string; where: string | null;
  size: string; budgetInr: number | null; by: string | null; answers: number; createdAt: string;
}
export interface Places { states: { slug: string; name: string; count: number; districts: { slug: string; name: string; count: number }[] }[]; kinds: { kind: string; label: string; count: number }[]; wanted: number; allStates: { slug: string; name: string }[] }

export const KIND_ICON: Record<string, string> = { FARM: '🌾', PLOT: '📐', INDUSTRIAL: '🏭', BUILT: '🏬' };
export const KIND_PLURAL: Record<string, string> = { FARM: 'Farm land', PLOT: 'Plots', INDUSTRIAL: 'Industrial land', BUILT: 'Warehouses and shops' };
export const PURPOSE_ICON: Record<string, string> = { WAREHOUSE: '📦', DARK_STORE: '🛒', FACTORY: '🏭', RETAIL: '🏪', FARMING: '🌾', HOUSING: '🏠', OTHER: '📍' };
const POSTER: Record<string, string> = { OWNER: 'Owner', DEALER: 'Dealer', COMPANY: 'Company' };
export const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const landPrice = (l: { priceInr: number | null; deal: string }) => (l.priceInr ? `${price(l.priceInr)}${l.deal === 'LEASE' ? ' a month' : ''}` : 'Price on request');
export const roadText = (l: { roadFt: number | null; highway: string | null; highwayKm: number | null }) =>
  [l.roadFt ? `${l.roadFt} ft road` : null, l.highway ? `${l.highwayKm != null ? `${l.highwayKm} km from ` : 'near '}${l.highway}` : null].filter(Boolean).join(' · ');

export function LandCard({ l }: { l: LandItem }) {
  const road = roadText(l);
  return (
    <li className={`land-card kind-${l.kind.toLowerCase()}`}>
      <Link href={`/land/listing/${l.slug}`} className="land-card-link">
        {l.photos[0] && <div className="land-photo"><img src={media(l.photos[0].file, 'card')} alt={`${l.title}: photo`} width={640} height={480} loading="lazy" decoding="async" />{l.photos.length > 1 && <span>▣ {l.photos.length}</span>}</div>}
        <div className="land-art"><span aria-hidden="true">{KIND_ICON[l.kind]}</span><b>{l.area}</b>{l.areaAlso && <small>about {l.areaAlso}</small>}</div>
        <div className="land-body">
          <p className="land-tags"><span>{l.kindLabel}</span><span className={l.deal === 'LEASE' ? 'rent' : ''}>{l.deal === 'LEASE' ? 'For rent' : 'For sale'}</span></p>
          <h3>{l.place}, {l.district}</h3>
          <p className="land-where">{l.state}</p>
          <p className="land-price"><strong>{landPrice(l)}</strong>{l.rate && <span>{l.rate}</span>}</p>
          {road && <p className="land-road">🛣 {road}</p>}
          <p className="land-foot">{POSTER[l.posterIs] ?? 'Owner'} · {ago(l.createdAt)}</p>
        </div>
      </Link>
    </li>
  );
}
export const LandGrid = ({ items }: { items: LandItem[] }) => <ul className="land-grid">{items.map((l) => <LandCard key={l.slug} l={l} />)}</ul>;

export function WantedCard({ w }: { w: WantedItem }) {
  return (
    <li className="want-card">
      <Link href={`/land/wanted/${w.slug}`}>
        <span className="want-icon" aria-hidden="true">{PURPOSE_ICON[w.purpose] ?? '📍'}</span>
        <div>
          <p className="land-tags"><span>Wanted</span><span>{w.purposeLabel}</span><span className={w.deal === 'LEASE' ? 'rent' : ''}>{w.deal === 'LEASE' ? 'On rent' : 'To buy'}</span></p>
          <h3>{w.size} of {w.kindLabel.toLowerCase()}</h3>
          <p className="land-where">{w.where ? `${w.where}, ` : ''}{w.state}</p>
          <p className="land-foot">{w.by ?? 'A company'}{w.budgetInr ? ` · up to ${price(w.budgetInr)}${w.deal === 'LEASE' ? ' a month' : ''}` : ''} · {ago(w.createdAt)}</p>
        </div>
        <span className="want-go">I have this →</span>
      </Link>
    </li>
  );
}
export const WantedGrid = ({ items }: { items: WantedItem[] }) => <ul className="want-grid">{items.map((w) => <WantedCard key={w.slug} w={w} />)}</ul>;

/** The two ways in for someone with something to offer or something to find. */
export function LandCtas() {
  return (
    <div className="land-ctas">
      <Link href="/land/post" className="land-cta sell"><span aria-hidden="true">🌾</span><div><strong>Have land or space to offer?</strong><small>List it free. No account needed, two minutes.</small></div><b>List it →</b></Link>
      <Link href="/land/wanted/post" className="land-cta want"><span aria-hidden="true">🔎</span><div><strong>Looking for land or space?</strong><small>Say what you need. Owners come to you.</small></div><b>Post a requirement →</b></Link>
    </div>
  );
}

/** A strip for pages about homes: tells the reader that land and commercial space exist here too, near where they are looking. */
export function LandBand({ state, city }: { state?: string; city?: string }) {
  const slug = state?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <aside className="land-strip" aria-label="Land and commercial space">
      <span aria-hidden="true">🌾</span>
      <div><strong>{city ? `Looking for land or a warehouse around ${city}?` : 'Selling land, or need space for a business?'}</strong><p>Farm land, plots, industrial land and warehouses across India, listed by owners. Companies post what they need.</p></div>
      <p className="land-strip-acts">{slug && state ? <Link className="abtn" href={`/land/${slug}`}>Land in {state}</Link> : <Link className="abtn" href="/land">Browse land</Link>}<Link className="abtn quiet" href="/land/post">List yours free</Link><Link href="/land/wanted/post">Post a requirement →</Link></p>
    </aside>
  );
}

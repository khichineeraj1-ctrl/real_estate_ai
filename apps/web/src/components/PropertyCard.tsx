import Link from 'next/link';
import { monthYear, num, price, statusLabel, typeLabel } from '@/lib/format';
import { media } from '@/lib/seo';
import type { PropertyCard as Card } from '@/lib/types';

/** Plain links and text only, so the same card renders on the server and inside the ask box. */
export function PropertyCard({ p }: { p: Card }) {
  const cover = p.photos?.[0]; // optional: responses cached before photos existed have no list
  const rate = Math.round(p.priceInr / p.areaSqft);
  return (
    <article className="card">
      {cover && <Link href={`/property/${p.slug}`} className="card-photo" tabIndex={-1} aria-hidden="true"><img src={media(cover.file, 'card')} alt="" width={640} height={480} loading="lazy" decoding="async" /></Link>}
      <div className="card-top">
        <span className="card-price">{price(p.priceInr)}</span>
        <span className={`tag ${p.status === 'READY_TO_MOVE' ? 'tag-ready' : ''}`}>{p.status === 'UNDER_CONSTRUCTION' && p.possession ? `Possession ${monthYear(p.possession)}` : statusLabel(p.status)}</span>
      </div>
      <h3><Link href={`/property/${p.slug}`}>{p.title}</Link></h3>
      <ul className="facts">
        <li>{typeLabel(p.type)}</li>
        {p.bhk > 0 && <li>{p.bhk} BHK</li>}
        <li>{num(p.areaSqft)} sq ft</li>
        <li>₹{num(rate)}/sq ft</li>
      </ul>
      <p className="card-foot">
        <Link href={`/${p.locality.city.slug}/${p.locality.slug}`}>{p.locality.name}</Link>, {p.locality.city.name}
        {p.project && <> · <Link href={`/projects/${p.project.slug}`}>{p.project.name}</Link></>}
      </p>
    </article>
  );
}

export function PropertyGrid({ items }: { items: Card[] }) {
  return <div className="grid">{items.map((p) => <PropertyCard key={p.slug} p={p} />)}</div>;
}

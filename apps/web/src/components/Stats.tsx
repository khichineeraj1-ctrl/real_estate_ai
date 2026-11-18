import { num, price, rate } from '@/lib/format';
import type { Stats as S } from '@/lib/types';

export function Stats({ stats }: { stats: S }) {
  if (!stats.count) return null; // nothing listed yet: no figures to show, rather than a row of dashes
  return (
    <dl className="stats">
      <div><dt>Homes listed</dt><dd>{num(stats.count)}</dd></div>
      <div><dt>Price range</dt><dd>{stats.count ? `${price(stats.minPrice)} – ${price(stats.maxPrice)}` : '—'}</dd></div>
      <div><dt>Average rate</dt><dd>{rate(stats.avgRate)}</dd></div>
    </dl>
  );
}

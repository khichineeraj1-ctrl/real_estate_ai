import Link from 'next/link';
import { breadcrumbLd, type Crumb } from '@/lib/seo';
import { JsonLd } from './JsonLd';

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const all = [{ name: 'Home', path: '/' }, ...crumbs];
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        {all.map((c, i) => (
          <li key={c.path}>{i < all.length - 1 ? <Link href={c.path}>{c.name}</Link> : <span aria-current="page">{c.name}</span>}</li>
        ))}
      </ol>
      <JsonLd data={breadcrumbLd(all)} />
    </nav>
  );
}

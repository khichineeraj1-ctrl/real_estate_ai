import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { WantedGrid, type WantedItem } from '@/components/land/cards';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'Land Wanted: Companies Looking for Warehouse, Factory and Store Space', description: 'See what companies and buyers are looking for: land for warehouses and factories, space for dark stores and shops, farm land. If you own something that fits, answer free.', path: '/land/wanted' });
export const dynamic = 'force-dynamic';

export default async function Wanted() {
  const wanted = await api<{ items: WantedItem[] }>('/land/wanted?take=60', { revalidate: 60 });
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Land', path: '/land' }, { name: 'Wanted', path: '/land/wanted' }]} />
      <div className="know-head"><div><h1>Wanted: land and space people are looking for</h1><p className="lead">Companies and buyers say what they need. If you own something that fits, answer and our team connects you. It costs nothing.</p></div><Link className="abtn" href="/land/wanted/post">Post a requirement</Link></div>
      <section className="section">{wanted && wanted.items.length > 0 ? <WantedGrid items={wanted.items} /> : <p className="empty">No open requirements right now. <Link href="/land/wanted/post">Post the first</Link>, or <Link href="/land/post">list your land</Link> so buyers can find it.</p>}</section>
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LandCtas, LandGrid, type LandItem } from '@/components/land/cards';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

type Props = { params: Promise<{ state: string; district: string }> };
export const dynamic = 'force-dynamic';
const load = async (params: Props['params']) => {
  const { state, district } = await params;
  const list = await api<{ total: number; items: LandItem[] }>(`/land?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&take=60`, { revalidate: 60 });
  return list && list.items.length > 0 ? { list, first: list.items[0] } : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  return pageMeta({ title: `Land for Sale in ${d.first.district}, ${d.first.state}: Farm Land, Plots & Warehouses`, description: `${d.list.total} listing${d.list.total === 1 ? '' : 's'} of farm land, plots, industrial land and built space in ${d.first.district} district, ${d.first.state}, with size, price per acre and road access.`, path: `/land/${d.first.stateSlug}/${d.first.districtSlug}` });
}

export default async function DistrictLand({ params }: Props) {
  const d = await load(params);
  if (!d) notFound(); // a district page exists only while something is listed in it
  const { first, list } = d;
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Land', path: '/land' }, { name: first.state, path: `/land/${first.stateSlug}` }, { name: first.district, path: `/land/${first.stateSlug}/${first.districtSlug}` }]} />
      <h1>Land and commercial space in {first.district}, {first.state}</h1>
      <p className="lead">{list.total} listing{list.total === 1 ? '' : 's'} from owners and dealers in {first.district} district, each checked by our team before it showed.</p>
      <section className="section"><LandGrid items={list.items} /></section>
      <section className="section"><LandCtas /></section>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LandCtas, LandGrid, WantedGrid, type LandItem, type Places, type WantedItem } from '@/components/land/cards';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

type Props = { params: Promise<{ state: string }> };
export const dynamic = 'force-dynamic';
const load = async (params: Props['params']) => {
  const { state } = await params;
  const places = await api<Places>('/land/places', { revalidate: 60 });
  const known = places?.allStates.find((s) => s.slug === state);
  return known ? { state: known, places: places!, live: places!.states.find((s) => s.slug === state) ?? null } : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  // A state with nothing listed stays out of search until it has something to show.
  return pageMeta({ title: `Land for Sale in ${d.state.name}: Farm Land, Plots & Industrial Land`, description: `Farm land, plots, industrial land and warehouses in ${d.state.name}, by district, listed by owners and checked by our team.`, path: `/land/${d.state.slug}`, noindex: !d.live });
}

export default async function StateLand({ params }: Props) {
  const d = await load(params);
  if (!d) notFound();
  const [list, wanted] = await Promise.all([api<{ total: number; items: LandItem[] }>(`/land?state=${d.state.slug}&take=36`, { revalidate: 60 }), api<{ items: WantedItem[] }>(`/land/wanted?state=${d.state.slug}&take=6`, { revalidate: 60 })]);
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Land', path: '/land' }, { name: d.state.name, path: `/land/${d.state.slug}` }]} />
      <h1>Land and commercial space in {d.state.name}</h1>
      <p className="lead">{list?.total ? `${list.total} listing${list.total === 1 ? '' : 's'} across ${d.live?.districts.length ?? 0} district${d.live?.districts.length === 1 ? '' : 's'}: farm land, plots, industrial land and built space.` : `Nothing is listed in ${d.state.name} yet.`}</p>
      {d.live && <ul className="chips left">{d.live.districts.map((x) => <li key={x.slug}><Link href={`/land/${d.state.slug}/${x.slug}`}>{x.name} <small>{x.count}</small></Link></li>)}</ul>}
      <section className="section">{list && list.items.length > 0 ? <LandGrid items={list.items} /> : <p className="empty">Be the first to list land in {d.state.name}, or post what you are looking for.</p>}</section>
      {wanted && wanted.items.length > 0 && <section className="section"><h2>Wanted in {d.state.name}</h2><WantedGrid items={wanted.items} /></section>}
      <section className="section"><LandCtas /></section>
    </>
  );
}

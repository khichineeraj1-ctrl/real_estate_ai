import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Launches, type Launch } from '@/components/Launches';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

interface Data { total: number; months: number; cities: { slug: string; name: string }[]; items: Launch[] }
type Props = { searchParams: Promise<{ city?: string }> };
export const revalidate = 300;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const city = (await searchParams).city;
  // One address is indexed; the same list narrowed to a city points back to it.
  return { ...pageMeta({ title: 'New Launch Projects — Recently RERA-Registered Homes', description: 'Newly launched residential projects, registered with RERA in the last 18 months and still being built, with registration dates, builders and site videos.', path: '/new-launches' }), ...(city ? { robots: { index: false, follow: true } } : {}) };
}

export default async function NewLaunches({ searchParams }: Props) {
  const raw = (await searchParams).city;
  const city = raw && /^[a-z0-9-]{1,60}$/.test(raw) ? raw : undefined;
  const [all, shown] = await Promise.all([api<Data>('/launches?all=1', { revalidate: 300 }), city ? api<Data>(`/launches?all=1&city=${city}`, { revalidate: 300 }) : null]);
  const d = shown ?? all;
  const cities = all?.cities ?? [];
  const here = cities.find((c) => c.slug === city);
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'New launches', path: '/new-launches' }]} />
      <h1>New launches{here ? ` in ${here.name}` : ''}</h1>
      {cities.length > 1 && (
        <p className="afilter">
          <Link href="/new-launches" aria-current={!city ? 'page' : undefined}>All cities</Link>
          {cities.map((c) => <Link key={c.slug} href={`/new-launches?city=${c.slug}`} rel="nofollow" aria-current={c.slug === city ? 'page' : undefined}>{c.name}</Link>)}
        </p>
      )}
      {d && d.items.length > 0
        ? <Launches items={d.items} total={d.total} months={d.months} all />
        : <p className="empty">No projects have been registered here in the last {all?.months ?? 18} months, as far as the registers we read show.</p>}
      <p className="calc-note">A project counts as new by the date on its RERA registration. Today only Haryana’s register prints that date, so this list covers Gurgaon; other cities will appear as their dates are read. Projects not yet registered are listed separately as <Link href="/#upcoming">upcoming</Link>, and are not for sale.</p>
      <p className="section"><Link href="/builders">All builders</Link> · <Link href="/compare">Compare projects</Link> · <Link href="/guides/rera-registration-explained">What RERA registration means</Link></p>
    </>
  );
}

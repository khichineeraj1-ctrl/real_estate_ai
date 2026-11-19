import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NotifyForm, type UpcomingItem } from '@/components/Upcoming';
import { api } from '@/lib/api';

type Detail = UpcomingItem & { notice: string; registeredAs: { slug: string; name: string } | null; createdAt: string };
type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';
const load = async (params: Props['params']) => api<Detail>(`/upcoming/${(await params).slug}`, { revalidate: 60 });

// Kept out of search: an unregistered project is shown for information, not advertised.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = await load(params);
  return { title: u ? `${u.name}, ${u.locality.name}: awaiting RERA registration` : 'Upcoming project', robots: { index: false, follow: false } };
}

export default async function UpcomingPage({ params }: Props) {
  const u = await load(params);
  if (!u) notFound();
  if (u.registeredAs) redirect(`/projects/${u.registeredAs.slug}`); // it has since been registered: its real page takes over
  return (
    <article className="up-page">
      <Breadcrumbs crumbs={[{ name: u.city.name, path: `/${u.city.slug}` }, { name: u.locality.name, path: `/${u.city.slug}/${u.locality.slug}` }, { name: u.name, path: `/upcoming/${u.slug}` }]} />
      <p className="up-flag">Upcoming · not yet RERA registered</p>
      <h1>{u.name}, {u.locality.name}, {u.city.name}</h1>
      <p className="lead">By {u.builder}{u.expected ? `. Expected: ${u.expected}` : ''}.</p>

      <div className="up-warn" role="note">
        <span aria-hidden="true">!</span>
        <div><strong>This project is not for sale yet.</strong><p>{u.notice} We show no price, and there is nothing to book. If anyone asks you for money for it, ask for its RERA registration number first.</p></div>
      </div>

      {u.youtubeId && (
        <div className="up-video">
          <iframe src={`https://www.youtube-nocookie.com/embed/${u.youtubeId}?rel=0`} title={u.videoTitle ?? `${u.name}: site video`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          <p>{u.videoTitle ?? 'Site video'}{u.sharedBy ? `, shared by ${u.sharedBy.name}, ${u.sharedBy.as}` : ''}.</p>
        </div>
      )}

      {u.about && <section className="section"><h2>What is planned</h2><p>{u.about}</p><p className="calc-note">As told to us{u.sharedBy ? ` by ${u.sharedBy.name}, ${u.sharedBy.as}` : ''}. Plans can change before registration; nothing here is confirmed by a regulator.</p></section>}

      <section className="section up-cta">
        <div><h2>Want to know when it is registered?</h2><p>We will email you once, when its registration appears on the RERA register. Then you can see its registration, the builder’s track record and what to check before paying.{u.waiting ? ` ${u.waiting} buyer${u.waiting === 1 ? ' is' : 's are'} waiting to hear.` : ''}</p></div>
        <NotifyForm slug={u.slug} name={u.name} />
      </section>

      <p className="section"><Link href="/guides/rera-registration-explained">Why registration matters</Link> · <Link href={`/${u.city.slug}/${u.locality.slug}`}>Registered projects in {u.locality.name}</Link></p>
    </article>
  );
}

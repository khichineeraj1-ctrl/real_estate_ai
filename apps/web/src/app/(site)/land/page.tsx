import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { KIND_ICON, KIND_PLURAL, LandCtas, LandGrid, WantedGrid, type LandItem, type Places, type WantedItem } from '@/components/land/cards';
import { api } from '@/lib/api';
import { BRAND, pageMeta } from '@/lib/seo';

const title = 'Land for Sale in India: Farm Land, Plots, Industrial Land & Warehouses';
const description = `Farm land, plots, industrial land and warehouses on rent across India, listed by owners and checked by our team. Companies post what they need; owners answer. Free on ${BRAND}.`;
export const metadata: Metadata = pageMeta({ title, description, path: '/land' });
export const dynamic = 'force-dynamic';

const KINDS = ['FARM', 'PLOT', 'INDUSTRIAL', 'BUILT'];
const BLURB: Record<string, string> = { FARM: 'Fields, orchards, farmhouses', PLOT: 'In towns and on town edges', INDUSTRIAL: 'For warehouses and factories', BUILT: 'Warehouses, sheds, shops' };

export default async function Land({ searchParams }: { searchParams: Promise<{ kind?: string; deal?: string }> }) {
  const sp = await searchParams;
  const kind = KINDS.includes(sp.kind ?? '') ? sp.kind! : '';
  const deal = sp.deal === 'LEASE' || sp.deal === 'SALE' ? sp.deal : '';
  const qs = new URLSearchParams({ ...(kind ? { kind } : {}), ...(deal ? { deal } : {}), take: '24' });
  const [places, list, wanted] = await Promise.all([api<Places>('/land/places', { revalidate: 60 }), api<{ total: number; items: LandItem[] }>(`/land?${qs}`, { revalidate: 60 }), api<{ items: WantedItem[] }>('/land/wanted?take=6', { revalidate: 60 })]);
  const href = (k: string, d: string) => { const q = new URLSearchParams({ ...(k ? { kind: k } : {}), ...(d ? { deal: d } : {}) }).toString(); return q ? `/land?${q}#listings` : '/land#listings'; };
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Land and commercial space', path: '/land' }]} />
      <section className="land-hero">
        <h1>Land and space, anywhere in India</h1>
        <p className="lead">Farm land, plots, industrial land and ready warehouses, from villages to city edges. Owners list free; companies say what they need.</p>
        <ul className="land-kinds">
          {(places?.kinds ?? []).map((k) => (
            <li key={k.kind}><Link href={href(kind === k.kind ? '' : k.kind, deal)} className={`kind-${k.kind.toLowerCase()} ${kind === k.kind ? 'on' : ''}`} aria-current={kind === k.kind ? 'true' : undefined}>
              <span aria-hidden="true">{KIND_ICON[k.kind]}</span><strong>{KIND_PLURAL[k.kind] ?? k.label}</strong><small>{BLURB[k.kind]}</small><em>{k.count ? `${k.count} listed` : 'Be the first'}</em>
            </Link></li>
          ))}
        </ul>
      </section>

      <LandCtas />

      <section className="section" id="listings">
        <div className="know-head">
          <h2>{kind ? KIND_PLURAL[kind] : 'Latest listings'}{deal ? (deal === 'LEASE' ? ' for rent' : ' for sale') : ''}</h2>
          <p className="land-pills">{[['', 'All'], ['SALE', 'For sale'], ['LEASE', 'For rent']].map(([d, label]) => <Link key={d} href={href(kind, d)} aria-current={deal === d ? 'true' : undefined}>{label}</Link>)}</p>
        </div>
        {list && list.items.length > 0 ? <LandGrid items={list.items} /> : <p className="empty">Nothing listed here yet. <Link href="/land/post">List yours free</Link>, or <Link href="/land/wanted/post">say what you are looking for</Link> and let owners come to you.</p>}
      </section>

      {wanted && wanted.items.length > 0 && (
        <section className="section">
          <div className="know-head"><div><h2>Wanted: companies looking now</h2><p className="lead">Have land or a building that fits? Answer, and our team connects you.</p></div><Link className="launch-all" href="/land/wanted">All requirements →</Link></div>
          <WantedGrid items={wanted.items} />
        </section>
      )}

      {places && places.states.length > 0 && (
        <section className="section">
          <h2>Browse by state</h2>
          <ul className="chips left">{places.states.map((s) => <li key={s.slug}><Link href={`/land/${s.slug}`}>{s.name} <small>{s.count}</small></Link></li>)}</ul>
        </section>
      )}

      <Faq title="Land on this site: common questions" faqs={[
        { q: 'Who can list land here?', a: 'Owners and their families, dealers and companies, anywhere in India. You do not need an account: fill one form, and our team checks it before it shows.' },
        { q: 'Is my phone number shown?', a: 'No. Buyers send their enquiry to our team, and we call you with their details. Your number is never published.' },
        { q: 'My land is measured in bigha. Is that a problem?', a: 'No. Write the size in the unit you use. Bigha, katha, biswa and marla are different sizes in different places, so we show them exactly as written and ask buyers to confirm the size in acres or square feet before comparing prices.' },
        { q: 'We are a company looking for land for a warehouse or a dark store. What do we do?', a: 'Post a requirement: what it is for, the size, the districts you will consider and what it must have. Owners with something that fits answer, and our team passes you their details. You can keep your company name hidden.' },
        { q: 'Does the site check who owns the land?', a: 'Our team checks that a listing is genuine and complete before it shows, but we do not verify ownership papers for land. Every listing page carries a list of what to check and which papers to see before paying anything.' },
      ]} />
    </>
  );
}

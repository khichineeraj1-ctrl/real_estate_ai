import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { InterestButton, type InvestOptions } from '@/components/invest/Interest';
import { InvestGrid, InvestNotice, STAGE_NAMES, StageBar, type InvestItem } from '@/components/invest/cards';
import { api } from '@/lib/api';
import { BRAND, pageMeta } from '@/lib/seo';

const title = 'Investor Corner: Upcoming Cities, Airports, Corridors and Where Land Is Changing';
const description = `Where government master plans are changing what land is for: new cities, airports, expressways and industrial zones across India, each with its official documents, how far along it is, and what to check. On ${BRAND}.`;
export const metadata: Metadata = pageMeta({ title, description, path: '/invest' });
export const dynamic = 'force-dynamic';

export default async function Invest() {
  const [list, o] = await Promise.all([api<{ notice: string; items: InvestItem[] }>('/invest', { revalidate: 60 }), api<InvestOptions & { stages: { code: string; label: string; means: string }[] }>('/invest/options', { revalidate: 3600 })]);
  const states = [...new Map((list?.items ?? []).map((a) => [a.stateSlug, a.state])).entries()];
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Investor corner', path: '/invest' }]} />
      <section className="inv-hero">
        <p className="inv-kicker">Investor corner</p>
        <h1>See where the map is about to change</h1>
        <p className="lead">New cities, airports, expressways and industrial zones, taken from the government’s own plans. For each: what is planned, how far along it really is, the documents, and the land listed nearby.</p>
        {o && <div className="inv-hero-acts"><InterestButton slug={null} o={o} label="Tell us what you are looking for" big /><Link href="/land">Browse land →</Link></div>}
      </section>
      {list && <InvestNotice text={list.notice} />}

      <section className="section" id="areas">
        <h2>{list?.items.length ? `${list.items.length} area${list.items.length === 1 ? '' : 's'} we are tracking` : 'Areas we are tracking'}</h2>
        {states.length > 1 && <ul className="chips left inv-states">{states.map(([slug, name]) => <li key={slug}><a href={`#state-${slug}`}>{name}</a></li>)}</ul>}
        {list && list.items.length > 0 ? <InvestGrid items={list.items} /> : <p className="empty">Our team is reading the master plans and will publish the first areas here shortly. Tell us what you are looking for and we will call you when something fits.</p>}
      </section>

      {o && (
        <section className="section">
          <h2>How to read the stage</h2>
          <p className="lead">The single most useful fact about any plan is how far along it is. We show the same five steps everywhere.</p>
          <ol className="inv-stages">{o.stages.map((s, i) => <li key={s.code}><StageBar index={i} names={STAGE_NAMES} /><div><strong>{s.label}</strong><p>{s.means}</p></div></li>)}</ol>
        </section>
      )}

      <Faq title="Investor corner: common questions" faqs={[
        { q: 'Where does this information come from?', a: 'From official documents: master plans, gazette notifications, and the pages of development authorities and ministries. Every area lists its sources with links, and the date our team last checked them.' },
        { q: 'Will prices rise in these areas?', a: 'We do not know, and we do not say. Nobody can promise that. We tell you what the government has planned and how much of it exists on the ground, so you can judge for yourself.' },
        { q: 'What is the biggest risk of buying near a planned project?', a: 'That the plan is late, shrinks, moves or is dropped, and that the plot you buy turns out to be inside an area marked for acquisition or for a use that does not allow what you want to build. Check the plan’s own map and the land record before paying.' },
        { q: 'What happens when I say I am interested?', a: 'Our team calls you, tells you what is listed in that area on this site, and can pass your requirement to owners. It costs nothing and you are not committed to anything.' },
      ]} />
    </>
  );
}

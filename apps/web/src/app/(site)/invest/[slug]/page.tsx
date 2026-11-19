import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { InterestButton, type InvestOptions } from '@/components/invest/Interest';
import { DRIVER_ICON, InvestNotice, StageBar, checked, type InvestItem } from '@/components/invest/cards';
import { LandGrid, type LandItem } from '@/components/land/cards';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

type Detail = InvestItem & { plan: string; stageNote: string | null; stageMeans: string | null; stages: string[]; sources: { label: string; url: string }[]; milestones: { when: string; what: string }[]; watch: string[]; notice: string; land: LandItem[]; firstDistrict: string | null };
type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';
const load = async (params: Props['params']) => api<Detail>(`/invest/${encodeURIComponent((await params).slug)}`, { revalidate: 60 });
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load(params);
  if (!a) return {};
  return pageMeta({ title: `${a.title}, ${a.state}: the plan, its stage and land nearby`, description: `${a.summary} Stage: ${a.stageLabel}. Official sources linked.`, path: `/invest/${a.slug}`, type: 'article' });
}

export default async function InvestArea({ params }: Props) {
  const [a, o] = await Promise.all([load(params), api<InvestOptions>('/invest/options', { revalidate: 3600 })]);
  if (!a) notFound();
  return (
    <article className="inv-page">
      <Breadcrumbs crumbs={[{ name: 'Investor corner', path: '/invest' }, { name: a.title, path: `/invest/${a.slug}` }]} />
      <header className={`inv-top drv-${a.driver.toLowerCase()}`}>
        <span className="inv-top-icon" aria-hidden="true">{DRIVER_ICON[a.driver] ?? '📍'}</span>
        <div>
          <p className="inv-kicker">{a.driverLabel} · {a.state}</p>
          <h1>{a.title}</h1>
          <p className="inv-where">{a.districts.length ? `${a.districts.join(', ')} · ` : ''}{a.authority ?? ''}</p>
        </div>
      </header>

      <section className="inv-stagebox" aria-labelledby="stage-h">
        <h2 id="stage-h">Where it stands: <span>{a.stageLabel}</span></h2>
        <StageBar index={a.stageIndex} names={a.stages} labels />
        {a.stageMeans && <p>{a.stageMeans}</p>}
        {a.stageNote && <p className="inv-stagenote">{a.stageNote}</p>}
      </section>

      {o && (
        <div className="land-ask">
          <div><strong>Thinking of buying here?</strong><p>Tell us your budget and what you want. Our team calls you with what is listed and what to check.{a.interested ? ` ${a.interested} ${a.interested === 1 ? 'person has' : 'people have'} shown interest.` : ''}</p></div>
          <InterestButton slug={a.slug} title={a.title} o={o} big />
        </div>
      )}

      <section className="section"><h2>What is planned</h2><p className="inv-summary">{a.summary}</p>{a.plan.split(/\n\s*\n|\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</section>

      {a.milestones.length > 0 && (
        <section className="section">
          <h2>Dates the authority has given</h2>
          <ol className="inv-times">{a.milestones.map((m, i) => <li key={i}><b>{m.when}</b><span>{m.what}</span></li>)}</ol>
          <p className="calc-note">These are official targets, not our forecast. Targets for large public projects are often missed.</p>
        </section>
      )}

      <section className="section">
        <h2>Before you buy near here</h2>
        <ol className="land-checks">
          {[...a.watch.map((w) => ({ title: w, why: '' })),
            { title: 'Find the plot on the plan’s own map', why: 'Check whether it falls inside the land being acquired, a green belt, a road reservation or a zone that does not allow what you want to build.' },
            { title: 'Check the land record and the seller', why: 'See the record of rights in the seller’s name and an encumbrance certificate. Around announced projects, the same land is sometimes sold more than once.' },
            { title: 'Ask what you can do with it today', why: 'Value that depends on a future change of land use, or on a road that is not yet built, depends on something that may not happen.' },
          ].map((c, i) => <li key={i}><i>{i + 1}</i><div><strong>{c.title}</strong>{c.why && <p>{c.why}</p>}</div></li>)}
        </ol>
      </section>

      <section className="section">
        <h2>Sources</h2>
        <ul className="inv-sources">{a.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.label} ↗</a><small>{host(s.url)}</small></li>)}</ul>
        <p className="calc-note">{checked(a.reviewedAt) ? `Our team last checked this page against these sources on ${checked(a.reviewedAt)}. ` : ''}If something here is out of date, the source is right and we are wrong.</p>
      </section>
      <InvestNotice text={a.notice} />

      <section className="section">
        <h2>Land listed in {a.districts[0] ?? a.state}</h2>
        {a.land.length > 0 ? <LandGrid items={a.land} /> : <p className="empty">Nothing is listed here yet. <Link href="/land/wanted/post">Post what you are looking for</Link> and owners in the area can answer, or <Link href="/land/post">list land you own here</Link>.</p>}
        <p className="section"><Link href={a.firstDistrict ? `/land/${a.stateSlug}/${a.firstDistrict}` : `/land/${a.stateSlug}`}>All land in {a.districts[0] ?? a.state} →</Link> · <Link href="/invest">Other areas we are tracking</Link></p>
      </section>
    </article>
  );
}

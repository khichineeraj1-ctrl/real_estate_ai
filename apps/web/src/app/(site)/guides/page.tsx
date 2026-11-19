import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

export interface GuideCard { slug: string; title: string; short: string; summary: string; icon: string; minutes: number; stage: string; accent: string }
interface Stage { key: string; step: string; title: string; blurb: string; guides: GuideCard[] }
export const revalidate = 3600;
export const metadata: Metadata = pageMeta({ title: 'Home Buying Guides — RERA, Carpet Area, Costs & Your Rights', description: 'Short, plain guides for home buyers in India: carpet area, RERA registration, the 10% rule, reading a cost sheet, delays and the occupation certificate.', path: '/guides' });

const tint = (accent: string) => ({ '--accent': accent } as React.CSSProperties);

export default async function Guides() {
  const [stageData, written] = await Promise.all([api<Stage[]>('/guide-stages', { revalidate: 3600 }), api<{ slug: string; title: string; summary: string; minutes: number; by: string | null }[]>('/articles?kind=GUIDE', { revalidate: 300 })]);
  const stages = stageData ?? [];
  const all = stages.flatMap((s) => s.guides);
  const minutes = all.reduce((n, g) => n + g.minutes, 0);
  const first = all[0];
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Guides', path: '/guides' }]} />
      <header className="guides-hero">
        <div>
          <p className="guides-eyebrow">Home buying guides</p>
          <h1>Buy a home knowing what the seller knows</h1>
          <p className="lead">{all.length} short guides, {minutes} minutes in all, in the order you will need them.</p>
          {first && <Link className="abtn" href={`/guides/${first.slug}`}>Start with step 1 →</Link>}
        </div>
        <ol className="guides-path" aria-label="The five steps">
          {stages.map((s, i) => <li key={s.key}><a href={`#${s.key}`}><span>{i + 1}</span>{s.title}</a></li>)}
        </ol>
      </header>

      <div className="journey">
        {stages.map((s, i) => (
          <section key={s.key} id={s.key} className="stage">
            <div className="stage-mark" aria-hidden="true"><span>{i + 1}</span></div>
            <div className="stage-body">
              <p className="stage-step">{s.step}</p>
              <h2>{s.title}</h2>
              <p className="stage-blurb">{s.blurb}</p>
              <ul className="gcards">
                {s.guides.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="gcard" style={tint(g.accent)}>
                      <span className="gcard-art" aria-hidden="true"><span>{g.icon}</span></span>
                      <span className="gcard-text">
                        <strong>{g.short}</strong>
                        <span>{g.summary}</span>
                        <b aria-hidden="true">{g.minutes} min read <i>→</i></b>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
      {(written?.length ?? 0) > 0 && (
        <section className="section">
          <h2>More guides from our writers</h2>
          <ul className="acards">{written!.map((a) => <li key={a.slug}><Link href={`/guides/${a.slug}`}><strong>{a.title}</strong><span>{a.summary}</span><b>{a.by ? `${a.by} · ` : ''}{a.minutes} min read →</b></Link></li>)}</ul>
        </section>
      )}
      <p className="section">Looking for news and notes? <Link href="/blog">Read the blog</Link>.</p>
      <p className="calc-note">General information about buying a home in India, not legal advice. Laws and rates change and differ by state; have your own lawyer read your papers.</p>
    </>
  );
}

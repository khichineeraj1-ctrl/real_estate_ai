import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ConnectButton } from '@/components/ConnectButton';
import { Shortlists } from '@/components/tools/Compare';
import { api } from '@/lib/api';
import { monthYear, num, price } from '@/lib/format';
import { builderPath, media, pageMeta, projectPath } from '@/lib/seo';
import type { ProjectDetail } from '@/lib/types';

// A page per combination of projects would be endless near-duplicates, so comparisons are not indexed.
export const metadata: Metadata = pageMeta({ title: 'Compare builder projects side by side', description: 'Put up to four builder projects side by side: builder, location, RERA registration and how it stands, verified agents and homes for sale.', path: '/compare/projects', noindex: true });

type Row = Omit<ProjectDetail, 'more' | 'properties'> & { homes: number; builderProjects: number; localityProjects: number; highlights: string[] };
type Tone = 'good' | 'warn' | 'info' | 'none';
interface Scorecard { slug: string; tag: { tone: Tone; text: string }; checks: { label: string; tone: Tone; text: string }[] }
interface Insight { key: string; tone: Tone; icon: string; title: string; text: string; slugs: string[] }
const MARK: Record<Tone, string> = { good: '✓', warn: '!', info: 'i', none: '–' };
type Props = { searchParams: Promise<{ ids?: string | string[] }> };

/** Where a registration stands today, from the register's own status and end date. */
function standing(p: Row): { key: 'current' | 'ended' | 'lapsed' | 'unknown'; text: string } {
  if (/lapsed/i.test(p.registerStatus ?? '')) return { key: 'lapsed', text: 'Marked lapsed by the register' };
  if (!p.registerValidUntil) return { key: 'unknown', text: p.reraId ? 'Registered' : 'Not on a register we read' };
  return new Date(p.registerValidUntil) < new Date() ? { key: 'ended', text: 'Registration period over' } : { key: 'current', text: 'Registration current' };
}

export default async function CompareProjects({ searchParams }: Props) {
  const raw = (await searchParams).ids;
  const ids = (Array.isArray(raw) ? raw.join(',') : raw ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const found = ids.length ? await api<{ projects: Row[]; scorecards: Scorecard[]; insights: Insight[] }>(`/compare/projects/insights?slugs=${encodeURIComponent(ids.join(','))}`, { revalidate: 60 }) : null;
  const ps = found?.projects ?? [];
  const crumbs = [{ name: 'Compare', path: '/compare' }, { name: 'Builder projects', path: '/compare/projects' }];

  if (ps.length < 2) {
    return (
      <>
        <Breadcrumbs crumbs={crumbs} />
        <h1>Compare builder projects side by side</h1>
        <p className="lead">{ps.length === 1 ? `You have chosen ${ps[0].name}. Choose at least one more.` : 'Choose two to four projects.'} Press “⇄ Compare” on any project card, then “Compare” in the bar at the bottom of the screen.</p>
        <Shortlists />
        <p className="section">Find projects by <Link href="/builders">builder</Link>, or open a city above and pick a locality.</p>
      </>
    );
  }

  const st = ps.map(standing);
  const row = (label: string, cells: React.ReactNode[], marks?: boolean[]) => (
    <tr><th scope="row">{label}</th>{cells.map((c, i) => <td key={ps[i].slug} className={marks?.[i] ? 'best' : undefined}>{c}{marks?.[i] && <span className="sr"> (stands out)</span>}</td>)}</tr>
  );
  // A row is only highlighted when the projects actually differ.
  const differ = (flags: boolean[]) => (flags.some(Boolean) && !flags.every(Boolean) ? flags : undefined);
  const most = (values: number[]) => { const top = Math.max(...values); return differ(values.map((v) => v === top && top > 0)); };
  const allAmenities = [...new Set(ps.flatMap((p) => p.amenities))].sort();

  const { scorecards, insights } = found!;
  const warnings = insights.filter((x) => x.tone === 'warn').length;

  return (
    <>
      <Breadcrumbs crumbs={crumbs} />
      <h1>Comparing {ps.length} projects</h1>
      <p className="lead">{warnings ? `${warnings} thing${warnings === 1 ? '' : 's'} to check before you choose, and ${insights.length - warnings} more worth knowing.` : `${insights.length} things worth knowing before you choose.`}</p>

      <ul className={`cards-vs cards-${ps.length}`}>
        {ps.map((p, i) => {
          const card = scorecards[i];
          return (
            <li key={p.slug} className={`vcard tone-${card.tag.tone}`}>
              {p.photos?.[0] ? <img src={media(p.photos[0].file, 'card')} alt={`${p.name}: photo`} width={640} height={480} loading="lazy" /> : <span className="vcard-letter" aria-hidden="true">{p.name.charAt(0).toUpperCase()}</span>}
              <span className={`vtag tone-${card.tag.tone}`}>{card.tag.text}</span>
              <h2><Link href={projectPath(p.city.slug, p)}>{p.name}</Link></h2>
              <p className="vcard-sub">{p.brand?.name ?? p.builder} · {p.locality.name}</p>
              <ul className="vchecks">
                {card.checks.map((c) => <li key={c.label} className={`tone-${c.tone}`}><i aria-hidden="true">{MARK[c.tone]}</i><span>{c.label}</span><strong>{c.text}</strong></li>)}
              </ul>
              <ConnectButton kind="project" slug={p.slug} name={p.name} mode={p.agents.length ? 'agent' : 'callback'} agents={p.agents.length} unclaimed={!!p.registerSource} />
            </li>
          );
        })}
      </ul>

      <section className="section">
        <h2>What separates them</h2>
        <ul className="insights">
          {insights.map((x) => (
            <li key={x.key} className={`insight tone-${x.tone}`}>
              <span className="insight-icon" aria-hidden="true">{x.icon}</span>
              <div><h3>{x.title}</h3><p>{x.text}</p></div>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="section">Every fact, side by side</h2>
      <div className="atable compare"><table>
        <thead>
          <tr>
            <th><span className="sr">What</span></th>
            {ps.map((p) => (
              <th key={p.slug} scope="col">
                {p.photos?.[0] && <img src={media(p.photos[0].file, 'card')} alt={`${p.name}: photo`} width={640} height={480} loading="lazy" />}
                <Link href={projectPath(p.city.slug, p)}>{p.name}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row('Where', ps.map((p) => <Link key={p.slug} href={`/${p.city.slug}/${p.locality.slug}`}>{p.locality.name}, {p.city.name}</Link>))}
          {row('Builder', ps.map((p) => (p.brand ? <Link key={p.slug} href={builderPath(p.city.slug, p.brand.slug)}>{p.brand.name}</Link> : p.builder)))}
          {row('Registered by', ps.map((p) => p.builder))}
          {row(`Builder’s registered projects in the city`, ps.map((p) => num(p.builderProjects)), most(ps.map((p) => p.builderProjects)))}
          {row('RERA registration', ps.map((_, i) => st[i].text), differ(st.map((x) => x.key === 'current')))}
          {row('Registration runs to', ps.map((p) => (p.registerValidUntil ? monthYear(p.registerValidUntil) : '—')))}
          {row('RERA number', ps.map((p) => (p.reraId ? (p.sourceUrl ? <a key={p.slug} href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{p.reraId}</a> : p.reraId) : '—')))}
          {row('Total homes in the project', ps.map((p) => (p.totalUnits != null ? num(p.totalUnits) : 'Not on the register')))}
          {row('Homes for sale here', ps.map((p) => (p.homes ? `${p.homes}, from ${price(p.stats.minPrice)}` : 'None listed yet')), most(ps.map((p) => p.homes)))}
          {row('Price', ps.map((p) => (p.stats.count ? `${price(p.stats.minPrice)} to ${price(p.stats.maxPrice)}` : 'Ask for a call back')))}
          {row('Agents we have verified', ps.map((p) => (p.agents.length ? `${p.agents.length} (${p.agents.map((a) => a.name).join(', ')})` : 'None yet')), most(ps.map((p) => p.agents.length)))}
          {row('Photos and videos', ps.map((p) => { const n = (p.photos?.length ?? 0) + (p.videos?.length ?? 0); return n ? `${n}` : 'None yet'; }), most(ps.map((p) => (p.photos?.length ?? 0) + (p.videos?.length ?? 0))))}
          {row('Other projects in the locality', ps.map((p) => num(Math.max(p.localityProjects - 1, 0))))}
          {row('The locality is known for', ps.map((p) => (p.highlights.length ? <ul key={p.slug} className="bullets">{p.highlights.map((h) => <li key={h}>{h}</li>)}</ul> : '—')))}
          {allAmenities.map((a) => <tr key={a}><th scope="row">{a}</th>{ps.map((p) => <td key={p.slug}>{p.amenities.includes(a) ? 'Yes' : '—'}</td>)}</tr>)}
          {row('', ps.map((p) => <ConnectButton key={p.slug} kind="project" slug={p.slug} name={p.name} mode={p.agents.length ? 'agent' : 'callback'} agents={p.agents.length} unclaimed={!!p.registerSource} />))}
        </tbody>
      </table></div>
      <p className="calc-note">These notes are worked out from the public RERA registers and from homes listed with us; they are not advice or a rating. A registration’s end date is the completion date the builder gave RERA, not a possession date. The registers give no prices or sizes.</p>
      <p className="section"><Link href="/compare">Compare something else</Link> · <Link href="/builders">All builders</Link></p>
    </>
  );
}

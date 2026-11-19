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
type Props = { searchParams: Promise<{ ids?: string | string[] }> };

/** Where a registration stands today, from the register's own status and end date. */
function standing(p: Row): { key: 'current' | 'ended' | 'lapsed' | 'unknown'; text: string } {
  if (/lapsed/i.test(p.registerStatus ?? '')) return { key: 'lapsed', text: 'Marked lapsed by the register' };
  if (!p.registerValidUntil) return { key: 'unknown', text: p.reraId ? 'Registered' : 'Not on a register we read' };
  return new Date(p.registerValidUntil) < new Date() ? { key: 'ended', text: 'Registration period over' } : { key: 'current', text: 'Registration current' };
}
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export default async function CompareProjects({ searchParams }: Props) {
  const raw = (await searchParams).ids;
  const ids = (Array.isArray(raw) ? raw.join(',') : raw ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const ps = ids.length ? (await api<Row[]>(`/compare/projects?slugs=${encodeURIComponent(ids.join(','))}`, { revalidate: 60 })) ?? [] : [];
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

  // What the comparison shows, in a few plain sentences, from the same facts as the table.
  const current = ps.filter((_, i) => st[i].key === 'current'); const lapsed = ps.filter((_, i) => st[i].key === 'lapsed'); const ended = ps.filter((_, i) => st[i].key === 'ended');
  const sameLocality = new Set(ps.map((p) => p.locality.slug)).size === 1;
  const verdict = [
    sameLocality ? `All ${ps.length} are in ${ps[0].locality.name}, ${ps[0].city.name}.` : `They are in ${list([...new Set(ps.map((p) => `${p.locality.name}, ${p.city.name}`))])}.`,
    current.length === ps.length ? 'Every one has a RERA registration that is still running.' : current.length ? `${list(current.map((p) => p.name))} ${current.length === 1 ? 'has a registration' : 'have registrations'} still running.` : '',
    ended.length ? `${list(ended.map((p) => p.name))} ${ended.length === 1 ? 'is' : 'are'} past the end of the registration period, which often means the building is complete; confirm with the builder.` : '',
    lapsed.length ? `${list(lapsed.map((p) => p.name))} ${lapsed.length === 1 ? 'is' : 'are'} marked lapsed by the register: ask the builder about this before paying anything.` : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <Breadcrumbs crumbs={crumbs} />
      <h1>Comparing {ps.length} projects</h1>
      <p className="lead">{verdict}</p>
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
      <p className="calc-note">Registration facts are as published on the public RERA registers. The registers give no prices, sizes or possession dates, so a row shows a price only when a builder or seller has listed homes here. A highlighted cell is where the projects differ, not a recommendation.</p>
      <p className="section"><Link href="/compare">Compare something else</Link> · <Link href="/builders">All builders</Link></p>
    </>
  );
}

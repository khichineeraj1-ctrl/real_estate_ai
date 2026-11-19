import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { api } from '@/lib/api';
import { LOAN_DEFAULTS, buyingCosts, loanPlan } from '@/lib/finance';
import { monthYear, num, price, rate, statusLabel, typeLabel } from '@/lib/format';
import { media, projectPath, pageMeta } from '@/lib/seo';
import { CompareStudio } from '@/components/tools/CompareStudio';
import type { CitySummary, PropertyDetail } from '@/lib/types';

// A page per combination of listings would be endless near-duplicates, so comparisons are not indexed.
export const metadata: Metadata = pageMeta({ title: 'Compare Projects, Localities and Homes Side by Side', description: 'Put builder projects, localities or homes next to each other: RERA standing, asking rates, the full cost of buying and more, with nothing left out.', path: '/compare' });

type Home = Omit<PropertyDetail, 'similar'>;
type Tone = 'good' | 'warn' | 'info' | 'none';
interface Scorecard { slug: string; tag: { tone: Tone; text: string }; checks: { label: string; tone: Tone; text: string }[] }
interface Insight { key: string; tone: Tone; icon: string; title: string; text: string; slugs: string[] }
const MARK: Record<Tone, string> = { good: '✓', warn: '!', info: 'i', none: '–' };
type Props = { searchParams: Promise<{ ids?: string | string[] }> };

export default async function ComparePage({ searchParams }: Props) {
  const raw = (await searchParams).ids;
  const ids = (Array.isArray(raw) ? raw.join(',') : raw ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const found = ids.length ? await api<{ homes: Home[]; scorecards: Scorecard[]; insights: Insight[] }>(`/compare/insights?slugs=${encodeURIComponent(ids.join(','))}`, { revalidate: 60 }) : null;
  const homes = found?.homes ?? [];

  if (homes.length < 2) {
    const cities = (await api<CitySummary[]>('/cities')) ?? [];
    return (
      <>
        <Breadcrumbs crumbs={[{ name: 'Compare', path: '/compare' }]} />
        <h1>Compare before you decide</h1>
        <p className="lead">Pick two or more and see them side by side.</p>
        {homes.length === 1 && <p className="astatus">You have chosen one home. Choose at least one more to compare homes.</p>}
        <CompareStudio cities={cities.map((c) => ({ slug: c.slug, name: c.name, localities: (c.localities ?? []).map((l) => ({ slug: l.slug, name: l.name })) }))} />
      </>
    );
  }

  const perSqft = (h: Home) => Math.round(h.priceInr / h.areaSqft);
  const vsArea = (h: Home) => (h.localityStats.avgRate ? Math.round(((perSqft(h) - h.localityStats.avgRate) / h.localityStats.avgRate) * 100) : null);
  const cost = (h: Home) => (h.costs ? buyingCosts(h.priceInr, h.costs, { underConstruction: h.status === 'UNDER_CONSTRUCTION' }) : null);
  const emi = (h: Home) => loanPlan(h.priceInr, LOAN_DEFAULTS.downPct, LOAN_DEFAULTS.ratePct, LOAN_DEFAULTS.years).monthly;
  // Marks the best value in a row (lowest or highest), unless every home ties.
  const best = (values: (number | null)[], lowest: boolean) => {
    const real = values.filter((v): v is number => v != null);
    if (real.length < 2 || real.every((v) => v === real[0])) return null;
    return lowest ? Math.min(...real) : Math.max(...real);
  };
  const row = (label: string, cells: React.ReactNode[], marks?: boolean[]) => (
    <tr><th scope="row">{label}</th>{cells.map((c, i) => <td key={homes[i].slug} className={marks?.[i] ? 'best' : undefined}>{c}{marks?.[i] && <span className="sr"> (best)</span>}</td>)}</tr>
  );
  const numeric = (label: string, values: (number | null)[], show: (v: number, i: number) => React.ReactNode, lowest: boolean) => {
    const b = best(values, lowest);
    return row(label, values.map((v, i) => (v == null ? '—' : show(v, i))), values.map((v) => b != null && v === b));
  };
  const { scorecards, insights } = found!;
  const warnings = insights.filter((x) => x.tone === 'warn').length;
  const allAmenities = [...new Set(homes.flatMap((h) => h.amenities))].sort();

  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Compare', path: '/compare' }, { name: 'Homes', path: '/compare' }]} />
      <h1>Comparing {homes.length} homes</h1>
      <p className="lead">{insights.length === 0 ? 'On the figures listed, nothing separates these; the table below has every detail.' : warnings ? `${warnings} thing${warnings === 1 ? '' : 's'} to check before you choose, and ${insights.length - warnings} more worth knowing.` : `${insights.length} thing${insights.length === 1 ? '' : 's'} worth knowing before you choose.`}</p>

      <ul className="cards-vs">
        {homes.map((h, i) => {
          const card = scorecards[i];
          return (
            <li key={h.slug} className={`vcard tone-${card.tag.tone}`}>
              {h.photos?.[0] ? <img src={media(h.photos[0].file, 'card')} alt={`${h.title}: photo`} width={640} height={480} loading="lazy" /> : <span className="vcard-letter" aria-hidden="true">{h.title.charAt(0).toUpperCase()}</span>}
              <span className={`vtag tone-${card.tag.tone}`}>{card.tag.text}</span>
              <h2><Link href={`/property/${h.slug}`}>{h.title}</Link></h2>
              <p className="vcard-sub">{h.bhk ? `${h.bhk} BHK · ` : ''}{num(h.areaSqft)} sq ft · {h.locality.name}</p>
              <ul className="vchecks">
                {card.checks.map((c) => <li key={c.label} className={`tone-${c.tone}`}><i aria-hidden="true">{MARK[c.tone]}</i><span>{c.label}</span><strong>{c.text}</strong></li>)}
              </ul>
              <Link className="abtn quiet" href={`/property/${h.slug}#contact`}>Contact the seller</Link>
            </li>
          );
        })}
      </ul>

      {insights.length > 0 && (
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
      )}

      <h2 className="section">Every fact, side by side</h2>
      <div className="atable compare"><table>
        <thead>
          <tr>
            <th><span className="sr">Feature</span></th>
            {homes.map((h) => (
              <th key={h.slug} scope="col">
                {h.photos?.[0] && <img src={media(h.photos[0].file, 'card')} alt={`${h.title}: photo`} width={640} height={480} loading="lazy" />}
                <Link href={`/property/${h.slug}`}>{h.title}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {numeric('Price', homes.map((h) => h.priceInr), (v) => <strong>{price(v)}</strong>, true)}
          {numeric('Rate per sq ft', homes.map(perSqft), (v) => rate(v), true)}
          {numeric('Against the area average', homes.map(vsArea), (v, i) => `${v === 0 ? 'Same as' : `${Math.abs(v)}% ${v > 0 ? 'above' : 'below'}`} ${homes[i].locality.name}`, true)}
          {numeric('Area', homes.map((h) => h.areaSqft), (v) => `${num(v)} sq ft`, false)}
          {numeric('Total cost to buy (estimate)', homes.map((h) => cost(h)?.total ?? null), (v) => price(v), true)}
          {numeric('Monthly EMI (example)', homes.map(emi), (v) => `₹${num(v)}`, true)}
          {row('Bedrooms', homes.map((h) => (h.bhk ? `${h.bhk} BHK` : '—')))}
          {row('Bathrooms', homes.map((h) => h.bathrooms || '—'))}
          {row('Type', homes.map((h) => typeLabel(h.type)))}
          {row('Status', homes.map((h) => (h.status === 'UNDER_CONSTRUCTION' && h.possession ? `Possession ${monthYear(h.possession)}` : statusLabel(h.status))))}
          {row('Locality', homes.map((h) => <Link key={h.slug} href={`/${h.city.slug}/${h.locality.slug}`}>{h.locality.name}, {h.city.name}</Link>))}
          {row('Project', homes.map((h) => (h.project ? <Link key={h.slug} href={projectPath(h.city.slug, h.project)}>{h.project.name}</Link> : '—')))}
          {row('Floor', homes.map((h) => (h.floor != null ? `${h.floor} of ${h.totalFloors}` : '—')))}
          {row('Facing', homes.map((h) => h.facing ?? '—'))}
          {row('Furnishing', homes.map((h) => h.furnishing ?? '—'))}
          {allAmenities.map((a) => <tr key={a}><th scope="row">{a}</th>{homes.map((h) => <td key={h.slug}>{h.amenities.includes(a) ? 'Yes' : '—'}</td>)}</tr>)}
          {row('', homes.map((h) => <Link key={h.slug} className="abtn quiet" href={`/property/${h.slug}#contact`}>Contact the seller</Link>))}
        </tbody>
      </table></div>
      <p className="calc-note">The best figure in each row is highlighted. EMI assumes {LOAN_DEFAULTS.downPct}% down, {LOAN_DEFAULTS.ratePct}% interest and {LOAN_DEFAULTS.years} years. The notes above are arithmetic on what sellers listed and what we have verified, not a valuation or advice. Charges and EMI are estimates. See the <Link href="/tools/cost-of-buying">true cost of buying</Link> for what they include.</p>
    </>
  );
}

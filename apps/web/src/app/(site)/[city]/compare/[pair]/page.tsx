import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { AskBox } from '@/components/AskBox';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { api } from '@/lib/api';
import { price, rate } from '@/lib/format';
import { comparePath, configSlug, projectPath, pageMeta } from '@/lib/seo';
import type { LocalityDetail } from '@/lib/types';

type Tone = 'good' | 'warn' | 'info' | 'none';
interface Scorecard { slug: string; tag: { tone: Tone; text: string }; checks: { label: string; tone: Tone; text: string }[] }
interface Insight { key: string; tone: Tone; icon: string; title: string; text: string; slugs: string[] }
const MARK: Record<Tone, string> = { good: '✓', warn: '!', info: 'i', none: '–' };
type Props = { params: Promise<{ city: string; pair: string }> };

// Built the first time someone asks for it, then served from cache and refreshed in the background every two minutes,
// so visitors and crawlers get the page without waiting for the catalogue.
export const revalidate = 120;
export async function generateStaticParams() { return []; }

async function load(params: Props['params']) {
  const { city, pair } = await params;
  const parts = pair.split('-vs-');
  if (parts.length !== 2 || !parts[0] || !parts[1] || parts[0] === parts[1]) return null;
  // One address per pair: /a-vs-b and /b-vs-a are the same comparison, so the unsorted form moves to the sorted one.
  if (comparePath(city, parts[0], parts[1]) !== `/${city}/compare/${pair}`) permanentRedirect(comparePath(city, parts[0], parts[1]));
  const found = await api<{ localities: [LocalityDetail, LocalityDetail]; scorecards: Scorecard[]; insights: Insight[] }>(`/compare/localities/${city}?a=${encodeURIComponent(parts[0])}&b=${encodeURIComponent(parts[1])}`);
  return found ? { a: found.localities[0], b: found.localities[1], scorecards: found.scorecards, insights: found.insights } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  const { a, b } = d;
  const path = comparePath(a.city.slug, a.slug, b.slug);
  const title = `${a.name} vs ${b.name}, ${a.city.name} — Property Prices Compared`;
  const description = `${a.name} or ${b.name}? Average rate ${rate(a.stats.avgRate)} against ${rate(b.stats.avgRate)}, prices from ${price(a.stats.minPrice)} and ${price(b.stats.minPrice)}, and homes available by size.`;
  // With no homes listed on either side there are no prices to compare, so the page is kept out of search until there are.
  if (!a.stats.count && !b.stats.count) return pageMeta({ title: `${a.name} vs ${b.name}, ${a.city.name}`, description: `${a.name} and ${b.name} in ${a.city.name}: what each is known for and the builder projects registered there.`, path, noindex: true });
  return pageMeta({ title, description, path: path });
}

export default async function CompareLocalities({ params }: Props) {
  const d = await load(params);
  if (!d) notFound();
  const { a, b, scorecards, insights } = d;
  const warnings = insights.filter((x) => x.tone === 'warn').length;
  const both = [a, b];
  const city = a.city;
  const cheaper = a.stats.avgRate && b.stats.avgRate && a.stats.avgRate !== b.stats.avgRate ? (a.stats.avgRate < b.stats.avgRate ? a : b) : null;
  const dearer = cheaper === a ? b : a;
  const gap = cheaper ? Math.round(((dearer.stats.avgRate! - cheaper.stats.avgRate!) / dearer.stats.avgRate!) * 100) : 0;
  const more = a.stats.count === b.stats.count ? null : a.stats.count > b.stats.count ? a : b;
  const sizes = [...new Set(both.flatMap((l) => l.bhk.map((x) => x.bhk)))].sort((x, y) => x - y);
  const priced = both.some((l) => l.stats.count > 0);
  const verdict = !priced
    ? `No homes are listed in ${a.name} or ${b.name} yet, so there are no prices to compare. Here is what each is known for and the projects registered there.`
    : cheaper
    ? `${cheaper.name} is the cheaper of the two: its homes are asking ${rate(cheaper.stats.avgRate)} on average, ${gap}% less than ${dearer.name} at ${rate(dearer.stats.avgRate)}.`
    : `${a.name} and ${b.name} are asking about the same on average, ${rate(a.stats.avgRate)}.`;
  const low = (x: number | null, y: number | null) => (x != null && y != null && x !== y ? Math.min(x, y) : null);
  const mark = (v: number | null, bestValue: number | null) => (bestValue != null && v === bestValue ? 'best' : undefined);
  const lowRate = low(a.stats.avgRate, b.stats.avgRate);
  const lowPrice = low(a.stats.minPrice, b.stats.minPrice);

  return (
    <>
      <Breadcrumbs crumbs={[{ name: city.name, path: `/${city.slug}` }, { name: `${a.name} vs ${b.name}`, path: comparePath(city.slug, a.slug, b.slug) }]} />
      <h1>{a.name} vs {b.name}: property in {city.name} compared</h1>
      <p className="lead">{warnings ? `${warnings} thing${warnings === 1 ? '' : 's'} to check before you choose, and ${insights.length - warnings} more worth knowing.` : `${insights.length} things worth knowing before you choose.`}</p>

      <ul className="cards-vs">
        {both.map((l, i) => {
          const card = scorecards[i];
          return (
            <li key={l.slug} className={`vcard tone-${card.tag.tone}`}>
              <span className={`vtag tone-${card.tag.tone}`}>{card.tag.text}</span>
              <h2><Link href={`/${city.slug}/${l.slug}`}>{l.name}</Link></h2>
              <p className="vcard-sub">{l.highlights[0] ?? city.name}</p>
              <ul className="vchecks">
                {card.checks.map((c) => <li key={c.label} className={`tone-${c.tone}`}><i aria-hidden="true">{MARK[c.tone]}</i><span>{c.label}</span><strong>{c.text}</strong></li>)}
              </ul>
              <Link className="abtn quiet" href={`/${city.slug}/${l.slug}`}>See {l.name}</Link>
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
        <thead><tr><th><span className="sr">Measure</span></th>{both.map((l) => <th key={l.slug} scope="col"><Link href={`/${city.slug}/${l.slug}`}>{l.name}</Link></th>)}</tr></thead>
        <tbody>
          {priced && <>
          <tr><th scope="row">Average asking rate</th>{both.map((l) => <td key={l.slug} className={mark(l.stats.avgRate, lowRate)}><strong>{rate(l.stats.avgRate)}</strong></td>)}</tr>
          <tr><th scope="row">Prices start at</th>{both.map((l) => <td key={l.slug} className={mark(l.stats.minPrice, lowPrice)}>{price(l.stats.minPrice)}</td>)}</tr>
          <tr><th scope="row">Most expensive home</th>{both.map((l) => <td key={l.slug}>{price(l.stats.maxPrice)}</td>)}</tr>
          <tr><th scope="row">Homes for sale</th>{both.map((l) => <td key={l.slug}>{l.stats.count}</td>)}</tr>
          </>}
          {sizes.map((n) => (
            <tr key={n}>
              <th scope="row">{n} BHK</th>
              {both.map((l) => { const x = l.bhk.find((y) => y.bhk === n); return <td key={l.slug}>{x ? <Link href={`/${city.slug}/${l.slug}/${configSlug(n)}`}>{x.count} from {price(x.minPrice)}</Link> : 'None listed'}</td>; })}
            </tr>
          ))}
          <tr><th scope="row">Projects</th>{both.map((l) => <td key={l.slug}>{l.projects.length ? <>{l.projects.slice(0, 6).map((p, i) => <span key={p.slug}>{i > 0 && ', '}<Link href={projectPath(city.slug, p)}>{p.name}</Link></span>)}{l.projects.length > 6 && <> and <Link href={`/${city.slug}/${l.slug}`}>more</Link></>}</> : '—'}</td>)}</tr>
          <tr><th scope="row">Known for</th>{both.map((l) => <td key={l.slug} className="awrap"><ul className="bullets">{l.highlights.map((h) => <li key={h}>{h}</li>)}</ul></td>)}</tr>
          <tr><th scope="row"><span className="sr">Links</span></th>{both.map((l) => <td key={l.slug}><Link className="abtn quiet" href={`/${city.slug}/${l.slug}`}>See homes in {l.name}</Link></td>)}</tr>
        </tbody>
      </table></div>

      <AskBox context={`${a.name}, ${city.name}`} placeholder={`Ask about ${a.name} or ${b.name}`} />

      <section className="section">
        <h2>Other comparisons</h2>
        <ul className="chips left">
          {both.flatMap((l) => l.nearby.filter((n) => n.slug !== a.slug && n.slug !== b.slug).slice(0, 3).map((n) => ({ l, n }))).map(({ l, n }) => (
            <li key={`${l.slug}-${n.slug}`}><Link href={comparePath(city.slug, l.slug, n.slug)}>{l.name} vs {n.name}</Link></li>
          ))}
        </ul>
      </section>

      <Faq title={`${a.name} or ${b.name}: common questions`} faqs={[
        { q: `Which is cheaper, ${a.name} or ${b.name}?`, a: verdict },
        { q: `Which has more homes for sale, ${a.name} or ${b.name}?`, a: `${a.name} has ${a.stats.count} homes listed and ${b.name} has ${b.stats.count}.` },
        { q: `What do homes cost in ${a.name} and ${b.name}?`, a: `In ${a.name}, prices run from ${price(a.stats.minPrice)} to ${price(a.stats.maxPrice)}. In ${b.name}, from ${price(b.stats.minPrice)} to ${price(b.stats.maxPrice)}.` },
      ]} />
    </>
  );
}

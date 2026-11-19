import Link from 'next/link';

export interface InvestItem {
  slug: string; title: string; driver: string; driverLabel: string; state: string; stateSlug: string; districts: string[]; summary: string;
  stage: string; stageLabel: string; stageIndex: number; authority: string | null; reviewedAt: string | null; interested: number;
}
export const DRIVER_ICON: Record<string, string> = { CITY: '🏙️', AIRPORT: '✈️', CORRIDOR: '🛣️', INDUSTRIAL: '🏭', TRANSIT: '🚇', PORT: '⚓', OTHER: '📍' };
export const STAGE_NAMES = ['Announced', 'Approved', 'Land being acquired', 'Being built', 'Open'];
export const checked = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null);

/** Five steps from announcement to opening, filled up to where the plan stands. The same picture on cards and pages. */
export function StageBar({ index, names = STAGE_NAMES, labels = false }: { index: number; names?: string[]; labels?: boolean }) {
  return (
    <ol className={`stagebar ${labels ? 'with-labels' : ''}`} aria-label={`Stage ${index + 1} of ${names.length}: ${names[index]}`}>
      {names.map((n, i) => <li key={n} className={i < index ? 'done' : i === index ? 'now' : ''} aria-current={i === index ? 'step' : undefined}><i aria-hidden="true" />{labels && <span>{n}</span>}</li>)}
    </ol>
  );
}

export function InvestCard({ a }: { a: InvestItem }) {
  return (
    <li className={`inv-card drv-${a.driver.toLowerCase()}`}>
      <Link href={`/invest/${a.slug}`}>
        <div className="inv-art"><span aria-hidden="true">{DRIVER_ICON[a.driver] ?? '📍'}</span><p><small>{a.driverLabel}</small><strong>{a.state}</strong></p></div>
        <div className="inv-body">
          <h3>{a.title}</h3>
          <p className="inv-sum">{a.summary}</p>
          <div className="inv-stage"><StageBar index={a.stageIndex} /><b>{a.stageLabel}</b></div>
          <p className="inv-foot">{a.districts.length ? `${a.districts.slice(0, 3).join(', ')}${a.districts.length > 3 ? ' and more' : ''} · ` : ''}{a.interested ? `${a.interested} interested` : 'Be the first to show interest'}</p>
        </div>
      </Link>
    </li>
  );
}
export const InvestGrid = ({ items }: { items: InvestItem[] }) => <ul className="inv-grid">{items.map((a) => <InvestCard key={a.slug} a={a} />)}</ul>;
export const InvestNotice = ({ text }: { text: string }) => <p className="inv-notice" role="note"><span aria-hidden="true">ⓘ</span>{text}</p>;

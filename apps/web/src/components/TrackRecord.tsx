import type { BuilderRecord } from '@/lib/types';
import { monthYear } from '@/lib/format';

/** A builder's registrations at a glance: a verdict, a bar split by where each registration stands, and the counts. */
export function TrackRecord({ name, place, r }: { name: string; place: string; r: BuilderRecord }) {
  if (!r.total) return null;
  const parts = [
    { key: 'current', label: 'Being built', n: r.current, hint: 'registration still running' },
    { key: 'ended', label: 'Past completion date', n: r.ended, hint: 'usually built' },
    { key: 'lapsed', label: 'Lapsed', n: r.lapsed, hint: 'no valid registration today' },
    { key: 'unknown', label: 'No date on record', n: r.unknown, hint: '' },
  ].filter((x) => x.n > 0);
  return (
    <section className={`section record tone-${r.verdict.tone}`} aria-label={`${name}: track record in ${place}`}>
      <div className="record-head">
        <span className="record-mark" aria-hidden="true">{r.verdict.tone === 'good' ? '✓' : r.verdict.tone === 'warn' ? '!' : 'i'}</span>
        <div><h2>{name}’s track record in {place}</h2><p><strong>{r.verdict.title}.</strong> {r.verdict.text}</p></div>
      </div>
      <div className="record-bar" role="img" aria-label={parts.map((x) => `${x.n} ${x.label.toLowerCase()}`).join(', ')}>
        {parts.map((x) => <i key={x.key} className={`rb-${x.key}`} style={{ flexGrow: x.n }} />)}
      </div>
      <ul className="record-counts">
        {parts.map((x) => <li key={x.key}><i className={`key rb-${x.key}`} aria-hidden="true" /><strong>{x.n}</strong><span>{x.label}{x.hint && <em> · {x.hint}</em>}</span></li>)}
      </ul>
      <dl className="record-facts">
        <div><dt>Registered projects</dt><dd>{r.total}</dd></div>
        {r.since && <div><dt>Registering here since</dt><dd>{r.since}{r.latest && r.latest !== r.since ? ` · latest ${r.latest}` : ''}</dd></div>}
        {r.nextDue && <div><dt>Next due</dt><dd>{r.nextDue.name}, {monthYear(r.nextDue.date)}</dd></div>}
      </dl>
      {r.lapsedNames.length > 0 && <p className="record-lapsed"><strong>Marked lapsed:</strong> {r.lapsedNames.join(', ')}{r.lapsed > r.lapsedNames.length ? ` and ${r.lapsed - r.lapsedNames.length} more` : ''}.</p>}
      <p className="calc-note">From the public RERA register. “Past completion date” means the date the builder gave RERA has passed; it is not proof of possession. This is a record of registrations, not a rating.</p>
    </section>
  );
}

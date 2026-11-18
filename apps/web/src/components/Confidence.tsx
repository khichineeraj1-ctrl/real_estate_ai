import { levelLabel, type Confidence } from '@/lib/trust';

/** A small label for cards and headings. The level is also in the text, never colour alone. */
export function ConfidenceBadge({ level }: { level: number | null | undefined }) {
  if (level == null) return null; // no data (for example a page cached before this existed): say nothing instead of guessing
  const l = level;
  return <span className={`conf conf-${l}`}>{l >= 2 ? '✓ ' : ''}{levelLabel(l)}</span>;
}

/** The level with everything it rests on: what was checked and what was not. */
export function ConfidenceReasons({ confidence }: { confidence: Confidence }) {
  return (
    <ul className="conf-reasons">
      {confidence.reasons.map((r) => (
        <li key={r.text} className={r.ok ? 'yes' : 'no'}><span aria-hidden="true">{r.ok ? '✓' : '○'}</span><span className="sr">{r.ok ? 'Checked: ' : 'Not checked: '}</span>{r.text}</li>
      ))}
    </ul>
  );
}

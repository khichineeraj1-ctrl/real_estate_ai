import type { ReactNode } from 'react';

/**
 * Turns a writer's plain text into the page: "## " starts a heading, "- " a list item, a blank line a new paragraph,
 * **bold** is bold and [text](link) is a link. Nothing is treated as HTML, so whatever is typed is shown as text.
 */
type Block = { kind: 'h'; text: string } | { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

export function parseArticle(body: string): Block[] {
  const out: Block[] = [];
  let para: string[] = []; let list: string[] = [];
  const flush = () => { if (para.length) out.push({ kind: 'p', text: para.join(' ') }); if (list.length) out.push({ kind: 'ul', items: list }); para = []; list = []; };
  for (const raw of body.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^#{1,3}\s+/.test(line)) { flush(); out.push({ kind: 'h', text: line.replace(/^#{1,3}\s+/, '') }); continue; }
    if (/^[-*•]\s+/.test(line)) { if (para.length) flush(); list.push(line.replace(/^[-*•]\s+/, '')); continue; }
    if (list.length) flush();
    para.push(line);
  }
  flush();
  return out;
}

/** Links go only to this site or to http(s) addresses; anything else is shown as its text. */
const safe = (href: string) => /^(https?:\/\/|\/(?!\/))/i.test(href);
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0; let m: RegExpExecArray | null; let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={n++}>{m[1]}</strong>);
    else if (safe(m[3])) parts.push(m[3].startsWith('/') ? <a key={n++} href={m[3]}>{m[2]}</a> : <a key={n++} href={m[3]} target="_blank" rel="noopener noreferrer nofollow">{m[2]}</a>);
    else parts.push(m[2]);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
export const headingId = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function ArticleBody({ body }: { body: string }) {
  const blocks = parseArticle(body);
  let n = 0;
  return (
    <div className="article-body">
      {blocks.map((b, i) => (b.kind === 'h'
        ? <h2 key={i} id={headingId(b.text)}><span aria-hidden="true">{++n}</span>{b.text}</h2>
        : b.kind === 'ul' ? <ul key={i}>{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>
          : <p key={i}>{inline(b.text)}</p>))}
    </div>
  );
}

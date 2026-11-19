'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { price } from '@/lib/format';
import { media } from '@/lib/seo';

interface Item { kind: 'project' | 'property'; slug: string; name: string; sub: string; href: string; photo: { file: string } | null; priceInr?: number; standing?: string | null; note: string | null }

async function send(method: 'POST' | 'DELETE', body: unknown) {
  const res = await fetch('/api/me/saved', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  return !!res?.ok;
}

function Card({ x }: { x: Item }) {
  const router = useRouter();
  const [note, setNote] = useState(x.note ?? '');
  const [state, setState] = useState<'idle' | 'busy' | 'kept'>('idle');
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const keep = async () => { setState('busy'); setState((await send('POST', { kind: x.kind, slug: x.slug, note })) ? 'kept' : 'idle'); };
  const remove = async () => { setState('busy'); if (await send('DELETE', { kind: x.kind, slug: x.slug })) { setGone(true); router.refresh(); } else setState('idle'); };
  return (
    <li className="saved">
      <Link href={x.href} className="saved-top">
        {x.photo ? <img src={media(x.photo.file, 'card')} alt="" width={640} height={480} loading="lazy" /> : <span className="vcard-letter" aria-hidden="true">{x.name.charAt(0).toUpperCase()}</span>}
        <span className="saved-kind">{x.kind === 'project' ? 'Project' : 'Home'}</span>
      </Link>
      <div className="saved-body">
        <h3><Link href={x.href}>{x.name}</Link></h3>
        <p>{x.sub}{x.priceInr ? ` · ${price(x.priceInr)}` : ''}</p>
        {x.standing && <p className="saved-standing">{x.standing}</p>}
        <label className="saved-note"><span className="sr">Your note on {x.name}</span>
          <textarea rows={2} maxLength={500} value={note} placeholder="Your note: what you liked, what to ask" onChange={(e) => { setNote(e.target.value); setState('idle'); }} onBlur={() => { if (note !== (x.note ?? '')) void keep(); }} />
        </label>
        <p className="saved-acts"><span role="status">{state === 'kept' ? 'Note kept ✓' : state === 'busy' ? 'Saving…' : ''}</span><button type="button" className="alink" onClick={remove}>Remove</button></p>
      </div>
    </li>
  );
}

/** What the buyer saved, each with a note they can change in place. */
export function SavedList({ items }: { items: Item[] }) {
  return <ul className="saved-grid">{items.map((x) => <Card key={`${x.kind}-${x.slug}`} x={x} />)}</ul>;
}

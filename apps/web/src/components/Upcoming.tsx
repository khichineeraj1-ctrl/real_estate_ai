'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { notifyUpcoming, type FollowState } from '@/app/(site)/actions';
import { useMe } from '@/lib/account';

export interface UpcomingItem {
  slug: string; name: string; builder: string; about: string | null; expected: string | null; youtubeId: string | null; videoTitle: string | null;
  locality: { slug: string; name: string }; city: { slug: string; name: string }; waiting: number; sharedBy: { name: string; as: string } | null;
}
const still = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** "Tell me when it is registered": the only thing a buyer can do about a project that is not registered yet. */
export function NotifyForm({ slug, name }: { slug: string; name: string }) {
  const [state, run, pending] = useActionState<FollowState, FormData>(notifyUpcoming.bind(null, slug), {});
  const me = useMe();
  const [open, setOpen] = useState(false);
  if (state.done) return <p className="up-done" role="status">🔔 We will email you once, when {name} is registered.</p>;
  if (!open) return <button type="button" className="abtn up-btn" onClick={() => setOpen(true)}>🔔 Tell me when it is registered</button>;
  return (
    <form action={run} className="up-form">
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      {!me?.signedIn && <input type="email" name="email" required autoFocus autoComplete="email" placeholder="Your email" aria-label="Your email" />}
      <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button type="submit" className="abtn" disabled={pending}>{pending ? 'Saving…' : 'Tell me'}</button>
      {me?.signedIn
        ? <p className="follow-consent">We will write to {me.email}, once.</p>
        : <label className="follow-consent"><input type="checkbox" name="consent" required /> <span>Email me once, when this project is registered.</span></label>}
    </form>
  );
}

/**
 * Upcoming projects on the home page: told to us by a builder or a verified agent, not yet on a RERA register, so shown
 * as information with no price and nothing to book. A site video plays over the page.
 */
export function Upcoming({ items, notice }: { items: UpcomingItem[]; notice: string }) {
  const [playing, setPlaying] = useState<UpcomingItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (playing) dialog.current?.showModal(); }, [playing]);
  return (
    <>
      <p className="up-notice"><strong>Awaiting RERA registration.</strong> {notice.replace(/^Not yet registered with RERA, so it is not for sale\. /, 'These are not for sale yet. ')}</p>
      <ul className="launches">
        {items.map((u) => (
          <li key={u.slug} className="launch upcoming">
            <div className="launch-art">
              {u.youtubeId
                ? <button type="button" className="launch-play" aria-label={`Play the site video of ${u.name}`} onClick={() => setPlaying(u)}><img src={still(u.youtubeId)} alt="" width={480} height={360} loading="lazy" referrerPolicy="no-referrer" /><span aria-hidden="true">▶</span></button>
                : <Link href={`/upcoming/${u.slug}`} tabIndex={-1} aria-hidden="true"><span className="launch-letter">{u.name.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase()}</span></Link>}
              <span className="launch-new up-tag">Not yet registered</span>
              {u.youtubeId && u.sharedBy && <span className="launch-by">▶ Site video by {u.sharedBy.name}</span>}
            </div>
            <div className="launch-body">
              <h3><Link href={`/upcoming/${u.slug}`}>{u.name}</Link></h3>
              <p>{u.builder} · {u.locality.name}, {u.city.name}</p>
              <dl>
                <div><dt>Expected</dt><dd>{u.expected ?? 'Not said'}</dd></div>
                <div><dt>Waiting to hear</dt><dd>{u.waiting ? `${u.waiting} buyer${u.waiting === 1 ? '' : 's'}` : 'Be the first'}</dd></div>
              </dl>
              <div className="up-act"><NotifyForm slug={u.slug} name={u.name} /></div>
            </div>
          </li>
        ))}
      </ul>
      {playing?.youtubeId && (
        <dialog ref={dialog} className="viewer launch-viewer" aria-label={`Site video of ${playing.name}`} onClose={() => setPlaying(null)} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
          <header className="viewer-top">
            <p><strong>{playing.name}</strong><span>{playing.videoTitle ?? 'Site video'}{playing.sharedBy ? ` · shared by ${playing.sharedBy.name}, ${playing.sharedBy.as}` : ''} · not yet RERA registered</span></p>
            <button type="button" className="viewer-close" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>
          </header>
          <div className="viewer-stage">
            <iframe className="viewer-video" src={`https://www.youtube-nocookie.com/embed/${playing.youtubeId}?autoplay=1&rel=0`} title={playing.videoTitle ?? `${playing.name}: site video`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </div>
          <p className="launch-viewer-foot"><Link className="abtn" href={`/upcoming/${playing.slug}`}>About {playing.name} →</Link></p>
        </dialog>
      )}
    </>
  );
}

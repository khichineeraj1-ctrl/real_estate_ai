'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { monthYear } from '@/lib/format';
import { media, projectPath } from '@/lib/seo';
import { ConnectButton } from './ConnectButton';
import { CompareToggle } from './tools/Compare';

export interface Launch {
  slug: string; name: string; builder: string; brand: { slug: string; name: string } | null; reraId: string | null; registerValidUntil: string | null; registeredOn: string;
  agents: number; photos?: { file: string }[]; locality: { slug: string; name: string }; city: { slug: string; name: string };
  video: { youtubeId: string; title: string | null; by: string | null } | null;
}
const still = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
/** "3 months ago", "last month", "this month". */
function ago(iso: string): string {
  const then = new Date(iso); const now = new Date();
  const m = (now.getUTCFullYear() - then.getUTCFullYear()) * 12 + now.getUTCMonth() - then.getUTCMonth();
  return m <= 0 ? 'this month' : m === 1 ? 'last month' : `${m} months ago`;
}

/**
 * Newly launched projects on the home page: cards that can be narrowed to the ones with a site video, each showing
 * when it was registered and when it is due. A video plays over the page, from YouTube's cookie-free address.
 */
export function Launches({ items, total, months, all = false }: { items: Launch[]; total: number; months: number; all?: boolean }) {
  const [onlyVideo, setOnlyVideo] = useState(false);
  const [playing, setPlaying] = useState<Launch | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (playing) dialog.current?.showModal(); }, [playing]);
  const withVideo = items.filter((x) => x.video);
  const shown = onlyVideo ? withVideo : items;
  return (
    <>
      <div className="launch-head">
        <p className="lead">Registered with RERA in the last {months} months and still being built. {total} so far{withVideo.length ? `, ${withVideo.length} with a video from the site` : ''}.</p>
        {!all && <Link className="launch-all" href="/new-launches">View all {total} →</Link>}
        {withVideo.length > 0 && (
          <div className="picks" role="group" aria-label="Show">
            <button type="button" className="pick" aria-pressed={!onlyVideo} onClick={() => setOnlyVideo(false)}>All</button>
            <button type="button" className="pick" aria-pressed={onlyVideo} onClick={() => setOnlyVideo(true)}>▶ With site video</button>
          </div>
        )}
      </div>
      <ul className={all ? 'launches is-grid' : 'launches'}>
        {shown.map((p) => {
          const href = projectPath(p.city.slug, p);
          return (
            <li key={p.slug} className="launch">
              <div className="launch-art">
                {p.video
                  ? <button type="button" className="launch-play" aria-label={`Play the site video of ${p.name}`} onClick={() => setPlaying(p)}><img src={still(p.video.youtubeId)} alt="" width={480} height={360} loading="lazy" referrerPolicy="no-referrer" /><span aria-hidden="true">▶</span></button>
                  : <Link href={href} tabIndex={-1} aria-hidden="true">{p.photos?.[0] ? <img src={media(p.photos[0].file, 'card')} alt="" width={640} height={480} loading="lazy" /> : <span className="launch-letter">{p.name.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase()}</span>}</Link>}
                <span className="launch-new">New · {ago(p.registeredOn)}</span>
                {p.video && <span className="launch-by">▶ Site video{p.video.by ? ` by ${p.video.by}` : ''}</span>}
              </div>
              <div className="launch-body">
                <h3><Link href={href}>{p.name}</Link></h3>
                <p>{p.brand?.name ?? p.builder} · {p.locality.name}, {p.city.name}</p>
                <dl>
                  <div><dt>Registered</dt><dd>{monthYear(p.registeredOn)}</dd></div>
                  <div><dt>Builder’s completion date</dt><dd>{p.registerValidUntil ? monthYear(p.registerValidUntil) : '—'}</dd></div>
                </dl>
                <div className="ptile-actions">
                  <ConnectButton kind="project" slug={p.slug} name={p.name} mode={p.agents > 0 ? 'agent' : 'callback'} agents={p.agents} unclaimed />
                  <CompareToggle kind="projects" slug={p.slug} title={p.name} />
                </div>
              </div>
            </li>
          );
        })}
        {!all && total > items.length && (
          <li className="launch launch-more"><Link href="/new-launches"><strong>+{total - items.length}</strong><span>more new launches</span><b>View all →</b></Link></li>
        )}
      </ul>
      {playing?.video && (
        <dialog ref={dialog} className="viewer launch-viewer" aria-label={`Site video of ${playing.name}`} onClose={() => setPlaying(null)} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
          <header className="viewer-top">
            <p><strong>{playing.name}</strong><span>{playing.video.title ?? 'Site video'}{playing.video.by ? ` · filmed by ${playing.video.by}, a verified agent` : ''}</span></p>
            <button type="button" className="viewer-close" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>
          </header>
          <div className="viewer-stage">
            <iframe className="viewer-video" src={`https://www.youtube-nocookie.com/embed/${playing.video.youtubeId}?autoplay=1&rel=0`} title={playing.video.title ?? `${playing.name}: site video`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </div>
          <p className="launch-viewer-foot"><Link className="abtn" href={projectPath(playing.city.slug, playing)}>See {playing.name} →</Link></p>
        </dialog>
      )}
    </>
  );
}

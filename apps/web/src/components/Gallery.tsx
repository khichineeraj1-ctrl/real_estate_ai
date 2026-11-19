'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PHOTO_GROUPS } from '@/lib/leads';
import { media } from '@/lib/seo';

export interface GalleryPhoto { file: string; width?: number; height?: number; category?: string | null }
export interface GalleryVideo { youtubeId: string; title?: string | null }

/** One thing the gallery can show: a photo of ours, or a video that lives on YouTube. */
interface Item { key: string; group: string | null; photo?: GalleryPhoto; video?: GalleryVideo }

const VIDEO = 'VIDEO';
const LABELS: Record<string, string> = { [VIDEO]: 'Videos', ...PHOTO_GROUPS };
const groupName = (c?: string | null) => (c && c in LABELS ? LABELS[c] : null);
/** The still picture YouTube publishes for a video. */
const still = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/**
 * The photos and videos of a home or a project. On the page: a banner of up to three, the cover large and two beside
 * it, with how many there are. Pressing any opens everything full screen, to arrow, swipe or tap through, by group.
 * A video plays from YouTube inside the viewer, and nothing is loaded from YouTube's player until it is opened.
 * Without scripts the banner's pictures are plain links to the full-size files (or to the video on YouTube).
 */
export function Gallery({ photos, videos = [], name }: { photos: GalleryPhoto[]; videos?: GalleryVideo[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const touch = useRef<number | null>(null);

  const items = useMemo<Item[]>(() => [
    ...photos.map((p) => ({ key: p.file, group: p.category ?? null, photo: p })),
    ...videos.map((v) => ({ key: `v-${v.youtubeId}`, group: VIDEO, video: v })),
  ], [photos, videos]);
  // The groups that have something in them, videos first, with a count each.
  const groups = useMemo(() => Object.keys(LABELS).map((code) => ({ code, label: LABELS[code], count: items.filter((x) => x.group === code).length })).filter((g) => g.count > 0), [items]);
  const shown = useMemo(() => (group ? items.filter((x) => x.group === group) : items), [items, group]);
  const index = Math.min(at, Math.max(shown.length - 1, 0));
  const current = shown[index];

  // Beside the cover: the first item of two other groups (videos before photos) when there are groups, otherwise the next two.
  const cover = items[0];
  const side = useMemo(() => {
    const picks: Item[] = [];
    for (const g of groups) { if (picks.length < 2 && g.code !== cover?.group) { const x = items.find((i) => i.group === g.code && i !== cover); if (x) picks.push(x); } }
    for (const x of items.slice(1)) if (picks.length < 2 && !picks.includes(x)) picks.push(x);
    return picks;
  }, [items, groups, cover]);

  const show = (item: Item, inGroup: string | null) => {
    const list = inGroup ? items.filter((x) => x.group === inGroup) : items;
    setGroup(inGroup); setAt(Math.max(list.indexOf(item), 0)); setOpen(true);
    requestAnimationFrame(() => dialog.current?.showModal());
  };
  const step = useCallback((by: number) => setAt((i) => (Math.min(i, shown.length - 1) + by + shown.length) % shown.length), [shown.length]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, step]);

  if (!items.length) return null;
  const both = photos.length > 0 && videos.length > 0;
  const allLabel = both ? 'All photos & videos' : videos.length ? 'All videos' : 'All photos';
  const tile = (x: Item, label: string | null, count: number | null, inGroup: string | null, big = false) => {
    const i = items.indexOf(x);
    return (
      <a key={x.key} style={big && x.photo?.width && x.photo.height ? ({ '--shape': Math.min(Math.max(x.photo.width / x.photo.height, 4 / 5), 16 / 9) } as React.CSSProperties) : undefined} href={x.video ? `https://www.youtube.com/watch?v=${x.video.youtubeId}` : media(x.photo!.file)} className={`shot ${big ? 'shot-big' : ''}`} onClick={(e) => { e.preventDefault(); show(x, inGroup); }} aria-label={`${label ?? (x.video ? 'Video' : 'Photo')}${count ? `, ${count}` : ''}: open the ${both ? 'photos and videos' : x.video ? 'videos' : 'photos'} of ${name}`}>
        {x.video
          ? <img src={still(x.video.youtubeId)} alt={`${name}: video${x.video.title ? `, ${x.video.title}` : ''}`} width={480} height={360} loading={big ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" />
          : <img src={media(x.photo!.file, big ? 'full' : 'card')} alt={`${name}${groupName(x.group) ? `, ${groupName(x.group)!.toLowerCase()}` : ''} — photo ${i + 1} of ${photos.length}`} width={big ? x.photo!.width ?? 1600 : 640} height={big ? x.photo!.height ?? 1067 : 480} loading={big ? 'eager' : 'lazy'} fetchPriority={big ? 'high' : undefined} decoding="async" />}
        {x.video && <span className="shot-play" aria-hidden="true">▶</span>}
        {(label || count) && <span className="shot-label"><strong>{label}</strong>{count != null && <span className="shot-count" aria-hidden="true">▣ {count}</span>}</span>}
      </a>
    );
  };
  return (
    <>
      <div className={`shots shots-${Math.min(items.length, 3)}`}>
        {tile(cover, items.length > 1 ? allLabel : null, items.length > 1 ? items.length : null, null, true)}
        {side.map((x) => { const g = groups.find((y) => y.code === x.group); return tile(x, g?.label ?? null, g?.count ?? null, g ? g.code : null); })}
      </div>

      {open && (
        <dialog ref={dialog} className="viewer" aria-label={`Photos and videos of ${name}`} onClose={() => setOpen(false)}>
          <header className="viewer-top">
            <p><strong>{name}</strong><span>{index + 1} of {shown.length}{current?.video?.title ? ` · ${current.video.title}` : groupName(current?.group) ? ` · ${groupName(current?.group)}` : ''}</span></p>
            <button type="button" className="viewer-close" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>
          </header>
          {groups.length > 0 && (
            <div className="viewer-groups" role="group" aria-label="Show">
              <button type="button" className="pick" aria-pressed={group === null} onClick={() => { setGroup(null); setAt(0); }}>All ({items.length})</button>
              {groups.map((g) => <button key={g.code} type="button" className="pick" aria-pressed={group === g.code} onClick={() => { setGroup(g.code); setAt(0); }}>{g.label} ({g.count})</button>)}
            </div>
          )}
          <div
            className="viewer-stage"
            onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); }}
          >
            {shown.length > 1 && <button type="button" className="viewer-nav prev" aria-label="Previous" onClick={() => step(-1)}>‹</button>}
            {current?.video && (
              // Played from YouTube's cookie-free address, and only once the viewer has this video in front.
              <iframe key={current.key} className="viewer-video" src={`https://www.youtube-nocookie.com/embed/${current.video.youtubeId}?autoplay=1&rel=0`} title={current.video.title ?? `${name}: video`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            )}
            {current?.photo && <img key={current.key} src={media(current.photo.file)} alt={`${name}${groupName(current.group) ? `, ${groupName(current.group)!.toLowerCase()}` : ''}`} width={current.photo.width} height={current.photo.height} />}
            {shown.length > 1 && <button type="button" className="viewer-nav next" aria-label="Next" onClick={() => step(1)}>›</button>}
          </div>
          {shown.length > 1 && (
            <div className="viewer-strip">
              {shown.map((x, i) => (
                <button key={x.key} type="button" aria-label={x.video ? `Video ${x.video.title ?? ''}` : `Photo ${i + 1}`} aria-current={i === index ? 'true' : undefined} onClick={() => setAt(i)}>
                  <img src={x.video ? still(x.video.youtubeId) : media(x.photo!.file, 'card')} alt="" width={96} height={72} loading="lazy" referrerPolicy="no-referrer" />
                  {x.video && <span className="strip-play" aria-hidden="true">▶</span>}
                </button>
              ))}
            </div>
          )}
        </dialog>
      )}
    </>
  );
}

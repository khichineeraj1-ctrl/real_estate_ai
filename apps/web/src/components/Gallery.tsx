'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PHOTO_GROUPS } from '@/lib/leads';
import { media } from '@/lib/seo';

export interface GalleryPhoto { file: string; width?: number; height?: number; category?: string | null }

const groupName = (c?: string | null) => (c && c in PHOTO_GROUPS ? PHOTO_GROUPS[c as keyof typeof PHOTO_GROUPS] : null);

/**
 * The photos of a home or a project. On the page: a banner of up to three, the cover large and two beside it, with
 * how many there are. Pressing any of them opens every photo full screen, to arrow, swipe or tap through, by group.
 * Without scripts the banner's pictures are plain links to the full-size files.
 */
export function Gallery({ photos, name }: { photos: GalleryPhoto[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const touch = useRef<number | null>(null);

  // The groups that have photos, in their set order, with a count each.
  const groups = useMemo(() => Object.keys(PHOTO_GROUPS).map((code) => ({ code, label: PHOTO_GROUPS[code as keyof typeof PHOTO_GROUPS], count: photos.filter((p) => p.category === code).length })).filter((g) => g.count > 0), [photos]);
  const shown = useMemo(() => (group ? photos.filter((p) => p.category === group) : photos), [photos, group]);
  const current = shown[Math.min(at, shown.length - 1)];

  // Beside the cover: the first photo of two other groups when there are groups, otherwise simply the next two.
  const side = useMemo(() => {
    const cover = photos[0];
    const picks: GalleryPhoto[] = [];
    for (const g of groups) { if (picks.length < 2 && g.code !== cover?.category) { const p = photos.find((x) => x.category === g.code && x !== cover); if (p) picks.push(p); } }
    for (const p of photos.slice(1)) if (picks.length < 2 && !picks.includes(p)) picks.push(p);
    return picks;
  }, [photos, groups]);

  const show = (photo: GalleryPhoto, inGroup: string | null) => {
    const list = inGroup ? photos.filter((p) => p.category === inGroup) : photos;
    setGroup(inGroup); setAt(Math.max(list.indexOf(photo), 0)); setOpen(true);
    requestAnimationFrame(() => dialog.current?.showModal());
  };
  const step = useCallback((by: number) => setAt((i) => (i + by + shown.length) % shown.length), [shown.length]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, step]);

  if (!photos.length) return null;
  const cover = photos[0];
  const tile = (p: GalleryPhoto, i: number, label: string | null, count: number | null, inGroup: string | null, big = false) => (
    <a key={p.file} href={media(p.file)} className={`shot ${big ? 'shot-big' : ''}`} onClick={(e) => { e.preventDefault(); show(p, inGroup); }} aria-label={`${label ?? 'Photo'}${count ? `, ${count} ${count === 1 ? 'photo' : 'photos'}` : ''}: open the photos of ${name}`}>
      <img src={media(p.file, big ? 'full' : 'card')} alt={`${name}${groupName(p.category) ? `, ${groupName(p.category)!.toLowerCase()}` : ''} — photo ${i + 1} of ${photos.length}`} width={big ? p.width ?? 1600 : 640} height={big ? p.height ?? 1067 : 480} loading={big ? 'eager' : 'lazy'} fetchPriority={big ? 'high' : undefined} decoding="async" />
      {(label || count) && <span className="shot-label"><strong>{label}</strong>{count != null && <span className="shot-count" aria-hidden="true">▣ {count}</span>}</span>}
    </a>
  );
  return (
    <>
      <div className={`shots shots-${Math.min(photos.length, 3)}`}>
        {tile(cover, 0, photos.length > 1 ? 'All photos' : null, photos.length > 1 ? photos.length : null, null, true)}
        {side.map((p) => { const g = groups.find((x) => x.code === p.category); return tile(p, photos.indexOf(p), g?.label ?? null, g?.count ?? null, g ? g.code : null); })}
      </div>

      {open && (
        <dialog ref={dialog} className="viewer" aria-label={`Photos of ${name}`} onClose={() => setOpen(false)}>
          <header className="viewer-top">
            <p><strong>{name}</strong><span>{Math.min(at, shown.length - 1) + 1} of {shown.length}{groupName(current?.category) ? ` · ${groupName(current?.category)}` : ''}</span></p>
            <button type="button" className="viewer-close" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>
          </header>
          {groups.length > 0 && (
            <div className="viewer-groups" role="group" aria-label="Show">
              <button type="button" className="pick" aria-pressed={group === null} onClick={() => { setGroup(null); setAt(0); }}>All ({photos.length})</button>
              {groups.map((g) => <button key={g.code} type="button" className="pick" aria-pressed={group === g.code} onClick={() => { setGroup(g.code); setAt(0); }}>{g.label} ({g.count})</button>)}
            </div>
          )}
          <div
            className="viewer-stage"
            onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); }}
          >
            {shown.length > 1 && <button type="button" className="viewer-nav prev" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>}
            {current && <img key={current.file} src={media(current.file)} alt={`${name}${groupName(current.category) ? `, ${groupName(current.category)!.toLowerCase()}` : ''}`} width={current.width} height={current.height} />}
            {shown.length > 1 && <button type="button" className="viewer-nav next" aria-label="Next photo" onClick={() => step(1)}>›</button>}
          </div>
          {shown.length > 1 && (
            <div className="viewer-strip">
              {shown.map((p, i) => (
                <button key={p.file} type="button" aria-label={`Photo ${i + 1}`} aria-current={i === Math.min(at, shown.length - 1) ? 'true' : undefined} onClick={() => setAt(i)}>
                  <img src={media(p.file, 'card')} alt="" width={96} height={72} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </dialog>
      )}
    </>
  );
}

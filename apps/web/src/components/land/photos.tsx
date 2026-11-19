'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { removeLandPhoto } from '@/app/(site)/land/actions';
import { media } from '@/lib/seo';

export interface PhotoRules { minLong: number; minShort: number; maxShape: number; tips: string[] }
/** The same limits the server applies, used when the page was not given them. */
export const DEFAULT_RULES: PhotoRules = { minLong: 800, minShort: 600, maxShape: 3, tips: [] };
const LONGEST = 2000; // phone photos are far larger than the site ever shows; shrinking first makes slow connections bearable

/** Makes a photo smaller in the browser before it is sent. If the browser cannot read it, the original goes as it is. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, LONGEST / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) { bitmap.close(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch { return file; }
}

/**
 * Looks at a chosen photo before anything is sent, so the poster is told at once, in plain words, why one will not do.
 * The server checks again; this only saves them the wait. Null means it looks fine.
 */
export async function checkPhoto(file: File, r: PhotoRules): Promise<string | null> {
  const name = file.name.toLowerCase();
  if (/\.(heic|heif)$/.test(name) || /hei[cf]/.test(file.type)) return 'This is an iPhone HEIC photo, which cannot be shown here. On the iPhone, open Settings → Camera → Formats and choose “Most Compatible”, or email the photo to yourself (that turns it into a JPEG), then add it again.';
  if (file.type.startsWith('video/')) return 'This is a video. Add a still photo instead.';
  if (file.type === 'application/pdf') return 'This is a PDF, not a photo. Take a picture of the land itself and add that.';
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return 'This file is not a photo we can use. Add a JPEG or PNG picture from your camera or gallery.';
  let w = 0; let h = 0;
  try { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); w = b.width; h = b.height; b.close(); } catch { return 'This photo is damaged and could not be opened. Choose it again from your gallery, or take a new one.'; }
  const long = Math.max(w, h); const short = Math.min(w, h);
  if (long < r.minLong || short < r.minShort) return `This photo is too small (${w} × ${h} pixels) and would look blurred on the listing. It needs to be at least ${r.minLong} × ${r.minShort}. Send the original from your camera or gallery: photos forwarded on WhatsApp, and screenshots of photos, are made much smaller.`;
  if (long / short > r.maxShape) return `This photo is too long and thin (${w} × ${h} pixels), like a panorama, and most of it would be cut off. Add an ordinary photo instead.`;
  return null;
}
export interface Refused { name: string; why: string }
/** Sorts chosen files into those that pass and those that do not, each with its reason. */
async function sift(files: File[], r: PhotoRules, have: File[] = []): Promise<{ ok: File[]; refused: Refused[] }> {
  const ok: File[] = []; const refused: Refused[] = [];
  for (const f of files) {
    const same = (x: File) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified;
    const why = have.some(same) || ok.some(same) ? 'You have already chosen this photo.' : await checkPhoto(f, r);
    if (why) refused.push({ name: f.name || 'Photo', why }); else ok.push(f);
  }
  return { ok, refused };
}
function RefusedList({ items }: { items: Refused[] }) {
  if (!items.length) return null;
  return (
    <div className="land-refused" role="alert">
      <strong>{items.length === 1 ? 'One photo was not added' : `${items.length} photos were not added`}</strong>
      <ul>{items.map((x, i) => <li key={i}><b>{x.name}</b><span>{x.why}</span></li>)}</ul>
    </div>
  );
}
function Tips({ rules }: { rules: PhotoRules }) {
  if (!rules.tips.length) return null;
  return <details className="land-tips" open><summary>What makes a photo that goes live</summary><ul>{rules.tips.map((t) => <li key={t}>{t}</li>)}</ul></details>;
}

async function sendOne(token: string, file: File): Promise<string | null> {
  const form = new FormData();
  form.set('token', token);
  form.set('photos', await shrink(file), 'photo.jpg');
  try {
    const res = await fetch('/api/land/photos', { method: 'POST', body: form });
    if (res.ok) return null;
    return ((await res.json().catch(() => null)) as { message?: string } | null)?.message ?? 'That photo could not be added.';
  } catch { return 'That photo could not be sent. Check your connection and try again.'; }
}
/** Sends photos one at a time, so a weak connection loses one photo and not all of them. Returns those that failed, with why. */
export async function uploadPhotos(token: string, files: File[], onStep?: (n: number) => void): Promise<Refused[]> {
  const failed: Refused[] = [];
  for (let i = 0; i < files.length; i++) { onStep?.(i + 1); const why = await sendOne(token, files[i]); if (why) failed.push({ name: files[i].name || `Photo ${i + 1}`, why }); }
  return failed;
}

function Thumbs({ items, remove }: { items: { key: string; src: string }[]; remove: (key: string) => void }) {
  if (!items.length) return null;
  return <ul className="land-thumbs">{items.map((x, i) => <li key={x.key}><img src={x.src} alt={`Photo ${i + 1}`} /><button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => remove(x.key)}>×</button></li>)}</ul>;
}
function AddButton({ left, onPick, busy, busyLabel = 'Sending…' }: { left: number; onPick: (files: File[]) => void; busy?: boolean; busyLabel?: string }) {
  if (left <= 0) return <p className="calc-note">That is the most photos a listing can have.</p>;
  return (
    <label className={`land-addphoto ${busy ? 'is-busy' : ''}`}>
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(e) => { onPick([...(e.target.files ?? [])].slice(0, left)); e.target.value = ''; }} />
      <span aria-hidden="true">📷</span><b>{busy ? busyLabel : 'Add photos'}</b><small>From your gallery or camera. {left} more allowed.</small>
    </label>
  );
}

/** In the posting form: choose photos now; they are sent once the listing itself has been saved. */
export function PhotoPicker({ files, set, max, rules = DEFAULT_RULES }: { files: File[]; set: (f: File[]) => void; max: number; rules?: PhotoRules }) {
  const [refused, setRefused] = useState<Refused[]>([]);
  const [checking, setChecking] = useState(false);
  const pick = async (picked: File[]) => { setChecking(true); const r = await sift(picked, rules, files); setChecking(false); setRefused(r.refused); set([...files, ...r.ok].slice(0, max)); };
  const previews = useMemo(() => files.map((f, i) => ({ key: `${i}-${f.name}-${f.size}`, src: URL.createObjectURL(f), file: f })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.src)), [previews]);
  return (
    <div className="wide land-photos">
      <Thumbs items={previews} remove={(key) => set(previews.filter((p) => p.key !== key).map((p) => p.file))} />
      <RefusedList items={refused} />
      <AddButton left={max - files.length} onPick={pick} busy={checking} busyLabel="Checking…" />
      <Tips rules={rules} />
    </div>
  );
}

/** On the poster's private page: the photos already on the listing, to remove or add to. */
export function PhotoManager({ token, photos, max, rules = DEFAULT_RULES }: { token: string; photos: string[]; max: number; rules?: PhotoRules }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [refused, setRefused] = useState<Refused[]>([]);
  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true); setNote('');
    // Checked here first for an instant answer; whatever the server still refuses is listed with its reason too.
    const { ok, refused: no } = await sift(files, rules);
    let added = 0;
    for (const f of ok) { const e = await sendOne(token, f); if (e) no.push({ name: f.name || 'Photo', why: e }); else added++; }
    setBusy(false); setRefused(no);
    setNote(added ? `Added ${added} photo${added === 1 ? '' : 's'}.` : '');
    router.refresh();
  };
  const remove = async (file: string) => {
    if (!window.confirm('Remove this photo?')) return;
    setBusy(true); const r = await removeLandPhoto(token, file); setBusy(false);
    setNote(r.error ?? 'Removed.'); router.refresh();
  };
  return (
    <div className="land-photos">
      <Thumbs items={photos.map((f) => ({ key: f, src: media(f, 'card') }))} remove={remove} />
      {note && <p role="status" className="calc-note">{note}</p>}
      <RefusedList items={refused} />
      <AddButton left={max - photos.length} onPick={add} busy={busy} />
      <Tips rules={rules} />
    </div>
  );
}

/** After posting: the photos that did not go up, each with its reason, read from where the form left them. */
export function MissedPhotos({ count }: { count: number }) {
  const [items, setItems] = useState<Refused[] | null>(null);
  useEffect(() => { try { const v = JSON.parse(window.sessionStorage.getItem('land-photo-refused') ?? 'null') as Refused[] | null; window.sessionStorage.removeItem('land-photo-refused'); if (Array.isArray(v)) setItems(v); } catch { /* fall back to the count */ } }, []);
  return (
    <div className="land-refused" role="alert">
      <strong>Your listing is saved, but {count === 1 ? 'one photo was' : `${count} photos were`} not added</strong>
      {items ? <ul>{items.map((x, i) => <li key={i}><b>{x.name}</b><span>{x.why}</span></li>)}</ul> : <p>Add them again under Photos below; each one that cannot be used will say why.</p>}
    </div>
  );
}

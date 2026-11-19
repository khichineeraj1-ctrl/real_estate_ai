'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { removeLandPhoto } from '@/app/(site)/land/actions';
import { media } from '@/lib/seo';

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
/** Sends photos one at a time, so a weak connection loses one photo and not all of them. Returns how many failed. */
export async function uploadPhotos(token: string, files: File[], onStep?: (n: number) => void): Promise<number> {
  let failed = 0;
  for (let i = 0; i < files.length; i++) { onStep?.(i + 1); if (await sendOne(token, files[i])) failed++; }
  return failed;
}

function Thumbs({ items, remove }: { items: { key: string; src: string }[]; remove: (key: string) => void }) {
  if (!items.length) return null;
  return <ul className="land-thumbs">{items.map((x, i) => <li key={x.key}><img src={x.src} alt={`Photo ${i + 1}`} /><button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => remove(x.key)}>×</button></li>)}</ul>;
}
function AddButton({ left, onPick, busy }: { left: number; onPick: (files: File[]) => void; busy?: boolean }) {
  if (left <= 0) return <p className="calc-note">That is the most photos a listing can have.</p>;
  return (
    <label className={`land-addphoto ${busy ? 'is-busy' : ''}`}>
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(e) => { onPick([...(e.target.files ?? [])].slice(0, left)); e.target.value = ''; }} />
      <span aria-hidden="true">📷</span><b>{busy ? 'Sending…' : 'Add photos'}</b><small>From your gallery or camera. {left} more allowed.</small>
    </label>
  );
}

/** In the posting form: choose photos now; they are sent once the listing itself has been saved. */
export function PhotoPicker({ files, set, max }: { files: File[]; set: (f: File[]) => void; max: number }) {
  const previews = useMemo(() => files.map((f, i) => ({ key: `${i}-${f.name}-${f.size}`, src: URL.createObjectURL(f), file: f })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.src)), [previews]);
  return (
    <div className="wide land-photos">
      <Thumbs items={previews} remove={(key) => set(previews.filter((p) => p.key !== key).map((p) => p.file))} />
      <AddButton left={max - files.length} onPick={(picked) => set([...files, ...picked].slice(0, max))} />
    </div>
  );
}

/** On the poster's private page: the photos already on the listing, to remove or add to. */
export function PhotoManager({ token, photos, max }: { token: string; photos: string[]; max: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true); setNote('');
    let failed = 0; let why = '';
    for (const f of files) { const e = await sendOne(token, f); if (e) { failed++; why = e; } }
    setBusy(false);
    setNote(failed ? `${failed} photo${failed === 1 ? '' : 's'} could not be added. ${why}` : `Added ${files.length} photo${files.length === 1 ? '' : 's'}.`);
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
      <AddButton left={max - photos.length} onPick={add} busy={busy} />
    </div>
  );
}

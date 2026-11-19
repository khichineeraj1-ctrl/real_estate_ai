'use client';

import { useRef, useState } from 'react';
import { DEFAULT_RULES, checkPhoto } from '@/components/land/photos';

const TIPS = [
  'At least 800 × 600 pixels: use the original from your camera or gallery, not one forwarded on WhatsApp.',
  'Taken in daylight, showing the home itself: the building, each room, the view.',
  'No screenshots, brochures, or pictures with phone numbers or other websites’ marks on them.',
  'The first photo is the cover buyers see in search, so start with your best.',
];

/**
 * The file box on a listing's photo form. Each chosen photo is looked at straight away; one that cannot be used is
 * taken out of the selection and listed with its reason, so the seller fixes it before uploading rather than after.
 */
export function PhotoInput({ plansToo = true }: { plansToo?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [refused, setRefused] = useState<{ name: string; why: string }[]>([]);
  const [kept, setKept] = useState<number | null>(null);
  const check = async () => {
    const el = input.current; if (!el?.files) return;
    // A floor plan is a drawing and may be any shape, so the shape rule waits for the server, which knows the group.
    const plan = plansToo && (el.form?.elements.namedItem('category') as HTMLSelectElement | null)?.value === 'PLAN';
    const rules = plan ? { ...DEFAULT_RULES, maxShape: Infinity } : DEFAULT_RULES;
    const ok = new DataTransfer(); const no: { name: string; why: string }[] = [];
    for (const f of [...el.files]) { const why = await checkPhoto(f, rules); if (why) no.push({ name: f.name || 'Photo', why }); else ok.items.add(f); }
    el.files = ok.files; setRefused(no); setKept(ok.files.length);
  };
  return (
    <div className="aphoto-input">
      <label className="afield"><span>Add photos</span><input ref={input} type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required onChange={check} /></label>
      {refused.length > 0 && (
        <div className="land-refused" role="alert">
          <strong>{refused.length === 1 ? 'One photo was taken out' : `${refused.length} photos were taken out`}{kept ? `; ${kept} will upload` : ''}</strong>
          <ul>{refused.map((x, i) => <li key={i}><b>{x.name}</b><span>{x.why}</span></li>)}</ul>
        </div>
      )}
      <details className="land-tips"><summary>What makes a photo that goes live</summary><ul>{TIPS.map((t) => <li key={t}>{t}</li>)}</ul></details>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { PHOTO_GROUPS } from '@/lib/leads';

/** Says what one photo shows. It saves as soon as a choice is made, and says so. */
export function PhotoGroup({ action, value }: { action: (category: string) => Promise<{ error?: string }>; value: string | null }) {
  const [current, setCurrent] = useState(value ?? '');
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  return (
    <label className="aphoto-group">
      <span className="sr">What this photo shows</span>
      <select value={current} disabled={pending} onChange={(e) => { const v = e.target.value; setCurrent(v); setNote(''); start(async () => { const r = await action(v); setNote(r.error ?? 'Saved'); }); }}>
        <option value="">Not grouped</option>
        {Object.entries(PHOTO_GROUPS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select>
      <small aria-live="polite">{pending ? 'Saving…' : note}</small>
    </label>
  );
}

/** The same choice on the upload form, applied to every photo in that upload. */
export function PhotoGroupField() {
  return (
    <label className="afield"><span>These photos show <em>(optional)</em></span>
      <select name="category" defaultValue=""><option value="">Not grouped</option>{Object.entries(PHOTO_GROUPS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
    </label>
  );
}

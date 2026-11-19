'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { setSaved, useMe } from '@/lib/account';

/** The heart on a project or home. Signed in, it saves and offers a note; signed out, it asks you to sign in first. */
export function SaveButton({ kind, slug, name }: { kind: 'project' | 'property'; slug: string; name: string }) {
  const me = useMe();
  const path = usePathname();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const item = me?.saved.find((s) => s.kind === kind && s.slug === slug);
  const [note, setNote] = useState<string | null>(null);
  const shown = note ?? item?.note ?? '';
  const toggle = async () => {
    if (!me?.signedIn) { setAsk(true); return; }
    setBusy(true); const on = !item; await setSaved(kind, slug, on); setBusy(false); setNoteOpen(on);
  };
  const keep = async () => { setBusy(true); await setSaved(kind, slug, true, shown); setBusy(false); setNoteOpen(false); };
  return (
    <div className="save">
      <button type="button" className={`save-btn ${item ? 'on' : ''}`} aria-pressed={!!item} disabled={busy || me === null} onClick={toggle}>
        <span aria-hidden="true">{item ? '♥' : '♡'}</span>{item ? 'Saved' : 'Save'}
      </button>
      {item && !noteOpen && <button type="button" className="alink" onClick={() => setNoteOpen(true)}>{item.note ? 'Edit note' : 'Add a note'}</button>}
      {item && item.note && !noteOpen && <span className="save-note">“{item.note}”</span>}
      {item && noteOpen && (
        <span className="save-edit">
          <input value={shown} maxLength={500} autoFocus aria-label={`Your note on ${name}`} placeholder="Your note, e.g. visit on Saturday" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void keep(); }} />
          <button type="button" className="abtn quiet" disabled={busy} onClick={keep}>Keep</button>
        </span>
      )}
      {ask && <span className="save-ask" role="status"><Link href={`/account?next=${encodeURIComponent(path)}`}>Sign in</Link> to save {name} and find it on any device.</span>}
    </div>
  );
}

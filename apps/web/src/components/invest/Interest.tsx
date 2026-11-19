'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { showInterest, type InterestState } from '@/app/(site)/invest/actions';

export interface InvestOptions { notice: string; budgets: { code: string; label: string }[]; wants: { code: string; label: string }[]; horizons: { code: string; label: string }[] }

function Pills({ name, legend, options }: { name: string; legend: string; options: { code: string; label: string }[] }) {
  const [value, setValue] = useState('');
  return (
    <fieldset className="land-choice">
      <legend>{legend}</legend>
      {options.map((o) => <label key={o.code} className={value === o.code ? 'on' : ''}><input type="radio" name={name} value={o.code} checked={value === o.code} onChange={() => setValue(o.code)} /><b>{o.label}</b></label>)}
    </fieldset>
  );
}

/** One button that opens a short form: who you are and, if you wish, your budget, what you want and when. */
export function InterestButton({ slug, title, o, label = 'I am interested', big }: { slug: string | null; title?: string; o: InvestOptions; label?: string; big?: boolean }) {
  const [state, run, pending] = useActionState<InterestState, FormData>(showInterest.bind(null, slug), {});
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  return (
    <>
      <button type="button" className={`abtn inv-btn ${big ? 'big' : ''}`} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <dialog ref={dialog} className="connect-dialog" aria-label={label} onClose={() => setOpen(false)} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
          <div className="land-reply">
            <button type="button" className="land-x" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>
            {state.done ? <><h2>Noted</h2><p role="status">Our team will call you{title ? ` about ${title}` : ''}. We will tell you what is listed there and what to check; we will not tell you what prices will do.</p><button type="button" className="abtn" onClick={() => dialog.current?.close()}>Done</button></> : (
              <form action={run}>
                <h2>{title ? `Interested in ${title}?` : 'Tell us what you are looking for'}</h2>
                <label className="afield"><span>Your name</span><input name="name" required maxLength={80} autoComplete="name" autoFocus /></label>
                <label className="afield"><span>Mobile number</span><input name="phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel" /></label>
                <Pills name="budget" legend="Budget (optional)" options={o.budgets} />
                <Pills name="wants" legend="Looking for (optional)" options={o.wants} />
                <Pills name="horizon" legend="When (optional)" options={o.horizons} />
                <label className="afield"><span>Anything else <em>(optional)</em></span><textarea name="note" rows={2} maxLength={600} /></label>
                <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                <label className="land-consent"><input type="checkbox" name="consent" required /> <span>Our team may call me about this.</span></label>
                {state.error && <p role="alert" className="aerror">{state.error}</p>}
                <button type="submit" className="abtn" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button>
              </form>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}

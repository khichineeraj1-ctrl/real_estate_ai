'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/admin/actions';
import { LEAD_STATUSES } from '@/lib/leads';

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** The status and private note for one lead, saved in place without leaving the list. */
export function LeadStatus({ action, status, note, who }: { action: Action; status: string; note: string | null; who: string }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="alead">
      <select name="status" defaultValue={status} aria-label={`Status of the lead from ${who}`}>
        {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <input name="note" defaultValue={note ?? ''} maxLength={300} placeholder="Private note" aria-label={`Private note on the lead from ${who}`} />
      <button type="submit" className="abtn quiet" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
      {state.error && <span role="alert" className="alead-msg error">{state.error}</span>}
      {state.ok && <span role="status" className="alead-msg">{state.ok}</span>}
    </form>
  );
}

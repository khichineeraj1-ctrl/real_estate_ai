'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/admin/actions';

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** Where staff record what they found about a report and uphold or dismiss it. */
export function DecideReport({ action, note, canTakeDown, decided }: { action: Action; note: string | null; canTakeDown: boolean; decided: boolean }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="aform adecide">
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      <label className="afield wide"><span>What you found</span><textarea name="note" rows={2} maxLength={500} required defaultValue={note ?? ''} placeholder="e.g. Called the buyer and the agent; agent confirmed asking for a token before the visit." /></label>
      {canTakeDown && <label className="acheck wide"><input type="checkbox" name="takeDown" /> <span>If upheld, also take this listing off the site</span></label>}
      <div className="aactions areview-buttons">
        <button type="submit" name="decision" value="uphold" className="abtn danger" disabled={pending}>{decided ? 'Change to upheld' : 'Uphold'}</button>
        <button type="submit" name="decision" value="dismiss" className="abtn quiet" disabled={pending}>{decided ? 'Change to dismissed' : 'Dismiss'}</button>
      </div>
    </form>
  );
}

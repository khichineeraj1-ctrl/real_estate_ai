'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/admin/actions';

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** Where staff record what they found about a report and uphold or dismiss it. */
export function DecideReport({ action, note, buyerNote, hasEmail, canTakeDown, decided }: { action: Action; note: string | null; buyerNote: string | null; hasEmail: boolean; canTakeDown: boolean; decided: boolean }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="aform adecide">
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      <label className="afield wide"><span>What you found</span><textarea name="note" rows={2} maxLength={500} required defaultValue={note ?? ''} placeholder="e.g. Called the buyer and the agent; agent confirmed asking for a token before the visit." /></label>
      <label className="afield wide"><span>Message to the buyer <em>(optional)</em></span><textarea name="buyerNote" rows={2} maxLength={400} defaultValue={buyerNote ?? ''} placeholder="Anything you want to add to the standard outcome wording. Do not include the seller’s private details." />
        <small>The buyer is told the outcome {hasEmail ? 'by email and ' : ''}on their private link{hasEmail ? '' : ' (they left no email)'}. They never see “What you found”.</small>
      </label>
      {canTakeDown && <label className="acheck wide"><input type="checkbox" name="takeDown" /> <span>If upheld, also take this listing off the site</span></label>}
      <div className="aactions areview-buttons">
        <button type="submit" name="decision" value="uphold" className="abtn danger" disabled={pending}>{decided ? 'Change to upheld' : 'Uphold'}</button>
        <button type="submit" name="decision" value="dismiss" className="abtn quiet" disabled={pending}>{decided ? 'Change to dismissed' : 'Dismiss'}</button>
      </div>
    </form>
  );
}

'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/admin/actions';

type Action = (state: FormState, form: FormData) => Promise<FormState>;
interface Checks { checkIdentity: boolean; checkRera: boolean; checkPhone: boolean; checkAddress: boolean }

/** Where staff record what they checked about a seller and decide. Each button submits the same form with a different decision. */
export function ReviewForm({ action, checks, owner, reviewNote, internalNote, complaints, approved }: { action: Action; checks: Checks; owner: boolean; reviewNote: string | null; internalNote: string | null; complaints: number; approved: boolean }) {
  const [state, run, pending] = useActionState(action, {});
  const tick = (name: keyof Checks, label: string) => (
    <label className="acheck wide"><input type="checkbox" name={name} defaultChecked={checks[name]} /> <span>{label}</span></label>
  );
  return (
    <form action={run} className="aform">
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      {state.ok && <p role="status" className="anotice">{state.ok}</p>}
      <p className="wide"><strong>What have you confirmed yourself?</strong> Tick only what you actually checked. These ticks are what buyers’ confidence rests on.</p>
      {tick('checkIdentity', 'Identity confirmed: the identity document is genuine and matches the name on the account')}
      {tick('checkRera', owner ? 'Ownership confirmed: I have seen papers showing they own or may sell the property' : 'RERA registration confirmed: I found this number on the state RERA register and it matches')}
      {tick('checkPhone', 'Phone confirmed: I spoke to them on the number on their account')}
      {tick('checkAddress', 'Address confirmed: by a visit, a document, or a public listing of the office')}
      <label className="afield wide"><span>Message to the seller <em>(needed to ask for more or turn down)</em></span><textarea name="reviewNote" rows={2} maxLength={500} defaultValue={reviewNote ?? ''} /></label>
      <label className="afield wide"><span>Internal note <em>(staff only)</em></span><textarea name="internalNote" rows={2} maxLength={1000} defaultValue={internalNote ?? ''} /></label>
      <label className="afield"><span>Upheld buyer complaints</span><input type="number" name="complaints" min={0} max={99} defaultValue={complaints} /><small>Any upheld complaint holds the seller at “Basic checks only” until set back to 0.</small></label>
      <div className="aactions areview-buttons">
        <button type="submit" name="decision" value="approve" className="abtn" disabled={pending}>{approved ? 'Save and keep verified' : 'Approve as verified'}</button>
        <button type="submit" name="decision" value="needs_info" className="abtn quiet" disabled={pending}>Ask for more</button>
        <button type="submit" name="decision" value="reject" className="abtn danger" disabled={pending}>Turn down</button>
      </div>
    </form>
  );
}

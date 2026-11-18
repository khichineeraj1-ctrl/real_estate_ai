'use client';

import { useActionState } from 'react';
import { reportListing, type ReportState } from '@/app/(site)/actions';
import { REPORT_REASONS } from '@/lib/trust';

/** Tucked behind a link so it does not compete with "Contact the seller", but always one click away. */
export function ReportForm({ slug }: { slug: string }) {
  const [state, run, pending] = useActionState<ReportState, FormData>(reportListing.bind(null, slug), {});
  if (state.sent) {
    return <p role="status" className="anotice">Thank you. Our team will look into this and may call you. We do not tell the seller who reported them.</p>;
  }
  return (
    <details className="report">
      <summary>Something wrong with this listing or seller? Report it</summary>
      <form action={run} className="aform">
        {state.error && <p role="alert" className="aerror">{state.error}</p>}
        <p className="wide">Tell us what happened. Our team looks into every report, and a report we uphold lowers the seller’s confidence level for all buyers. We do not tell the seller who reported them.</p>
        <label className="afield wide"><span>What is wrong?</span>
          <select name="reason" required defaultValue=""><option value="">Choose…</option>{REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
        </label>
        <label className="afield wide"><span>What happened?</span><textarea name="details" rows={3} required minLength={15} maxLength={1000} placeholder="e.g. The agent asked for ₹50,000 as a token before showing the flat." /></label>
        <label className="afield"><span>Your name</span><input name="name" required maxLength={80} autoComplete="name" /></label>
        <label className="afield"><span>Phone</span><input name="phone" type="tel" required autoComplete="tel" inputMode="tel" /><small>So our team can ask you for details. Not shared with the seller.</small></label>
        <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <div className="aactions"><button type="submit" className="abtn quiet" disabled={pending}>{pending ? 'Sending…' : 'Send report'}</button></div>
      </form>
    </details>
  );
}

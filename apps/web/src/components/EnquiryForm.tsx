'use client';

import { useActionState } from 'react';
import { enquire, type EnquiryState } from '@/app/(site)/actions';

export function EnquiryForm({ slug }: { slug: string }) {
  const [state, run, pending] = useActionState<EnquiryState, FormData>(enquire.bind(null, slug), {});

  if (state.sent) {
    return (
      <div className="enquiry-done" role="status">
        <p><strong>Your enquiry is sent.</strong></p>
        {state.seller
          ? <p>You can also call the seller directly: {state.seller.name}, <a href={`tel:${state.seller.phone}`}>{state.seller.phone}</a>.</p>
          : <p>Our team will call you about this home.</p>}
      </div>
    );
  }
  return (
    <form action={run} className="aform">
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      <label className="afield"><span>Your name</span><input name="name" required maxLength={80} autoComplete="name" /></label>
      <label className="afield"><span>Phone</span><input name="phone" type="tel" required autoComplete="tel" inputMode="tel" /></label>
      <label className="afield"><span>Email <em>(optional)</em></span><input name="email" type="email" autoComplete="email" /></label>
      <label className="afield wide"><span>Message <em>(optional)</em></span><textarea name="message" rows={2} maxLength={500} placeholder="e.g. Is the price negotiable? When can I visit?" /></label>
      <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="acheck wide"><input type="checkbox" name="consent" required /> <span>Share my name and phone number with the seller so they can contact me about this home.</span></label>
      <div className="aactions"><button type="submit" className="abtn" disabled={pending}>{pending ? 'Sending…' : 'Get seller’s contact'}</button></div>
    </form>
  );
}

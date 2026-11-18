'use client';

import { useActionState } from 'react';
import { enquire, type EnquiryState } from '@/app/(site)/actions';

interface Props {
  slug: string;
  /** A listing enquiry reveals the seller's contact afterwards; a project lead is passed to the builder's sales team. */
  kind?: 'property' | 'project';
  /** Choices for "Interested in" on a project, e.g. the sizes it offers. */
  interests?: string[];
  projectName?: string;
}

export function EnquiryForm({ slug, kind = 'property', interests, projectName }: Props) {
  const [state, run, pending] = useActionState<EnquiryState, FormData>(enquire.bind(null, kind, slug), {});
  const project = kind === 'project';

  if (state.sent) {
    return (
      <div className="enquiry-done" role="status">
        <p><strong>{project ? 'Thank you. Your details are with the sales team.' : 'Your enquiry is sent.'}</strong></p>
        {project
          ? <p>Someone will call you about {projectName ?? 'this project'} with prices, floor plans and site visit times.</p>
          : state.seller
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
      {project && interests && interests.length > 0 && (
        <label className="afield"><span>Interested in <em>(optional)</em></span>
          <select name="interest" defaultValue=""><option value="">Any size</option>{interests.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </label>
      )}
      <label className="afield wide"><span>Message <em>(optional)</em></span><textarea name="message" rows={2} maxLength={500} placeholder={project ? 'e.g. I would like to visit this weekend' : 'e.g. Is the price negotiable? When can I visit?'} /></label>
      <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="acheck wide"><input type="checkbox" name="consent" required /> <span>{project
        ? `I agree to be contacted by phone or email about ${projectName ?? 'this project'} by the builder and this site’s team.`
        : 'Share my name and phone number with the seller so they can contact me about this home.'}</span></label>
      <div className="aactions"><button type="submit" className="abtn" disabled={pending}>{pending ? 'Sending…' : project ? 'Request a call back' : 'Get seller’s contact'}</button></div>
    </form>
  );
}

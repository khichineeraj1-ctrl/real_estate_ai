'use client';

import { usePathname } from 'next/navigation';
import { useActionState, useRef, useState } from 'react';
import { enquire, type EnquiryState } from '@/app/(site)/actions';
import { siteUse } from '@/lib/intent';
import { BUDGETS, LOANS, PURPOSES, TIMELINES } from '@/lib/leads';

interface Props {
  slug: string;
  /** A project lead is passed to the builder's sales team (or ours). A listing enquiry goes to whoever posted the home. */
  kind?: 'property' | 'project';
  /**
   * For a listing: true when an owner or agent posted it, so the buyer is shown their name and number after enquiring.
   * False for a builder's stock or a home our team added, which takes a call-back request instead.
   */
  reveal?: boolean;
  /** Choices for "Interested in" on a project, e.g. the sizes it offers. */
  interests?: string[];
  /** The project's or home's name, for the wording. */
  projectName?: string;
  /** A project page made from a RERA register, whose builder has not joined us: our own team answers, not the builder's. */
  unclaimed?: boolean;
  /** 'agent': the buyer asked to be connected to a verified agent selling the project, who is shown to them afterwards. */
  via?: 'agent';
  /** The short form used on cards: name, phone, when they plan to buy and a site visit. */
  compact?: boolean;
}

/** One question answered with a tap. Tapping the chosen answer again clears it; every question is optional. */
function Taps({ name, label, options }: { name: string; label: string; options: Record<string, string> }) {
  const [value, setValue] = useState('');
  return (
    <fieldset className="taps wide">
      <legend>{label}</legend>
      <input type="hidden" name={name} value={value} />
      {Object.entries(options).map(([code, text]) => (
        <button key={code} type="button" className="pick" aria-pressed={value === code} onClick={() => setValue(value === code ? '' : code)}>{text}</button>
      ))}
    </fieldset>
  );
}

export function EnquiryForm({ slug, kind = 'property', reveal = true, interests, projectName, unclaimed, via, compact }: Props) {
  const [state, run, pending] = useActionState<EnquiryState, FormData>(enquire.bind(null, kind, slug, via ?? null), {});
  const path = usePathname();
  const opened = useRef(Date.now());
  const signals = useRef<HTMLInputElement>(null);
  const project = kind === 'project';
  // A call back is asked for on a project, and on a home no owner or agent stands behind; otherwise the seller is shown.
  const callback = project || !reveal;
  const about = projectName ?? (project ? 'this project' : 'this home');

  if (state.sent && state.agent) {
    return (
      <div className="enquiry-done" role="status">
        <p><strong>You are connected.</strong></p>
        <p>Your agent for {about} is {state.agent.name}{state.agent.firmName ? ` of ${state.agent.firmName}` : ''}: <a href={`tel:${state.agent.phone}`}>{state.agent.phone}</a>. They have your details and will call you.</p>
        <p>We have verified this agent ({state.agent.label.toLowerCase()}). Even so, do not pay a booking amount before you have seen the site and checked the project’s RERA registration.</p>
      </div>
    );
  }
  if (state.sent) {
    return (
      <div className="enquiry-done" role="status">
        <p><strong>{callback ? (unclaimed ? 'Thank you. Our team has your details.' : project ? 'Thank you. Your details are with the sales team.' : 'Thank you. Your request is in.') : 'Your enquiry is sent.'}</strong></p>
        {project
          ? <p>{unclaimed ? `We will call you about ${about}. The builder has not joined us yet, so we will find out what we can for you.` : `Someone will call you about ${about} with prices, floor plans and site visit times.`}</p>
          : state.seller
            ? (
              <>
                <p>You can also call the seller directly: {state.seller.name}, <a href={`tel:${state.seller.phone}`}>{state.seller.phone}</a>.</p>
                {(state.seller.level ?? 0) >= 2
                  ? <p>We have verified this seller ({state.seller.label?.toLowerCase()}).</p>
                  : <p className="aerror">We have not fully verified this seller yet. Do not pay a token, booking amount or any advance before you have seen the home and had its papers checked.</p>}
              </>
            )
            : <p>You will get a call back about this home.</p>}
      </div>
    );
  }
  return (
    <form action={run} className="aform" onSubmit={() => { if (signals.current) signals.current.value = JSON.stringify(siteUse(path, opened.current)); }}>
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      <label className="afield"><span>Your name</span><input name="name" required maxLength={80} autoComplete="name" /></label>
      <label className="afield"><span>Phone</span><input name="phone" type="tel" required autoComplete="tel" inputMode="tel" /></label>
      {!compact && <label className="afield"><span>Email <em>(optional)</em></span><input name="email" type="email" autoComplete="email" /></label>}
      {!compact && project && interests && interests.length > 0 && (
        <label className="afield"><span>Interested in <em>(optional)</em></span>
          <select name="interest" defaultValue=""><option value="">Any size</option>{interests.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </label>
      )}

      {!compact && <p className="wide taps-intro"><strong>A little about your plans</strong> <em>(optional)</em>. It helps the right person call you, with the right answers.</p>}
      <Taps name="timeline" label={compact ? 'When do you plan to buy? (optional)' : 'When do you plan to buy?'} options={TIMELINES} />
      {!compact && <Taps name="budget" label="Your budget" options={BUDGETS} />}
      {!compact && <Taps name="loan" label="How will you pay?" options={LOANS} />}
      {!compact && <Taps name="purpose" label="The home is" options={PURPOSES} />}
      <label className="acheck wide"><input type="checkbox" name="wantsVisit" /> <span>I would like to arrange a site visit.</span></label>

      {!compact && <label className="afield wide"><span>Message <em>(optional)</em></span><textarea name="message" rows={2} maxLength={500} placeholder={callback ? 'e.g. I would like to visit this weekend' : 'e.g. Is the price negotiable? When can I visit?'} /></label>}
      <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <input type="hidden" name="signals" ref={signals} />
      <label className="acheck wide"><input type="checkbox" name="consent" required /> <span>{via === 'agent' ? `Share my name and phone number with a verified agent selling ${about}, and with this site’s team, so they can contact me.` : project
        ? unclaimed ? `I agree to be contacted by phone or email about ${about} by this site’s team, who may pass my enquiry to the builder.` : `I agree to be contacted by phone or email about ${about} by the builder and this site’s team.`
        : callback ? 'I agree to be contacted by phone or email about this home by its builder or this site’s team.'
          : 'Share my name and phone number with the seller so they can contact me about this home.'}</span></label>
      <p className="wide calc-note">{compact ? 'We also pass on a short note of how you used this site (pages opened, calculators used).' : 'With your enquiry we pass on your answers above and a short note of how you used this site (pages opened, calculators used), so you are called by someone who knows what you are looking for.'}</p>
      <div className="aactions"><button type="submit" className="abtn" disabled={pending}>{pending ? 'Sending…' : via === 'agent' ? 'Connect me' : callback ? 'Request a call back' : 'Get seller’s contact'}</button></div>
    </form>
  );
}

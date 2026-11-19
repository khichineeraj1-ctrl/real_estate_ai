'use client';

import { usePathname } from 'next/navigation';
import { useActionState, useId, useRef, useState } from 'react';
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
  interest?: string;
  /** The project's or home's name, for the wording. */
  projectName?: string;
  /** A project page made from a RERA register, whose builder has not joined us: our own team answers, not the builder's. */
  unclaimed?: boolean;
  /** 'agent': the buyer asked to be connected to a verified agent selling the project, who is shown to them afterwards. */
  via?: 'agent';
  /** The short form used on cards: name, phone, when they plan to buy and a site visit. */
  compact?: boolean;
}

const nameProblem = (v: string) => (v.trim().replace(/[^\p{L}]/gu, '').length >= 2 ? null : 'Enter your name');
const digits = (v: string) => v.replace(/[\s()+-]/g, '');
const phoneProblem = (v: string) => (/^\d{10,13}$/.test(digits(v)) ? null : `${digits(v).length} of 10 digits`);

/** A text box that answers back as the buyer types: the label lifts, a count runs, and a tick appears once it is right. */
function LiveField({ label, name, type = 'text', value, onChange, check, autoComplete, hint }: { label: string; name: string; type?: 'text' | 'tel'; value: string; onChange: (v: string) => void; check: (v: string) => string | null; autoComplete: string; hint?: string }) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const problem = check(value);
  const ok = !!value && !problem;
  const bad = touched && !!value && !!problem;
  return (
    <div className={`fld ${ok ? 'is-ok' : ''} ${bad ? 'is-bad' : ''}`}>
      <div className="fld-box">
        <input id={id} name={name} type={type} value={value} placeholder=" " required maxLength={name === 'name' ? 80 : 20} autoComplete={autoComplete} inputMode={type === 'tel' ? 'tel' : undefined} aria-invalid={bad || undefined} aria-describedby={`${id}-note`} onChange={(e) => onChange(e.target.value)} onBlur={() => setTouched(true)} />
        <label htmlFor={id}>{label}</label>
        <span className="fld-tick" aria-hidden="true">✓</span>
      </div>
      <p id={`${id}-note`} className="fld-note" aria-live="polite">{value && problem ? problem : ok && type === 'tel' ? 'Looks right' : hint}</p>
    </div>
  );
}

const WHEN_ICON: Record<string, string> = { NOW: '🔥', SOON: '📅', LATER: '🗓️', EXPLORING: '👀' };

/** "When do you plan to buy?" as four cards to tap, each with a picture. Tapping the chosen one again clears it. */
function WhenCards({ optional }: { optional?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <fieldset className="when wide">
      <legend>When do you plan to buy?{optional && <em> (optional)</em>}</legend>
      <input type="hidden" name="timeline" value={value} />
      <div className="when-grid">
        {Object.entries(TIMELINES).map(([code, text]) => (
          <button key={code} type="button" className="when-card" aria-pressed={value === code} onClick={() => setValue(value === code ? '' : code)}>
            <span className="when-icon" aria-hidden="true">{WHEN_ICON[code]}</span><span>{text}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
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

export function EnquiryForm({ slug, kind = 'property', reveal = true, interests, interest, projectName, unclaimed, via, compact }: Props) {
  const [state, run, pending] = useActionState<EnquiryState, FormData>(enquire.bind(null, kind, slug, via ?? null), {});
  const path = usePathname();
  const opened = useRef(Date.now());
  const signals = useRef<HTMLInputElement>(null);
  const project = kind === 'project';
  // A call back is asked for on a project, and on a home no owner or agent stands behind; otherwise the seller is shown.
  const callback = project || !reveal;
  const about = projectName ?? (project ? 'this project' : 'this home');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [visit, setVisit] = useState(false);
  const [consent, setConsent] = useState(false);
  // What still stands between the buyer and sending: shown as a bar that fills, and on the button.
  const done = [!nameProblem(name), !phoneProblem(phone), consent].filter(Boolean).length;
  const ready = done === 3;

  if (state.sent && state.agent) {
    return (
      <div className="enquiry-done" role="status">
        <span className="done-burst" aria-hidden="true">✓</span>
        <p><strong>You are connected.</strong></p>
        <p>Your agent for {about} is {state.agent.name}{state.agent.firmName ? ` of ${state.agent.firmName}` : ''}: <a href={`tel:${state.agent.phone}`}>{state.agent.phone}</a>. They have your details and will call you.</p>
        <p>We have verified this agent ({state.agent.label.toLowerCase()}). Even so, do not pay a booking amount before you have seen the site and checked the project’s RERA registration.</p>
      </div>
    );
  }
  if (state.sent) {
    return (
      <div className="enquiry-done" role="status">
        <span className="done-burst" aria-hidden="true">✓</span>
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
    <form action={run} className={`aform lead-form ${compact ? 'is-compact' : ''}`} onSubmit={() => { if (signals.current) signals.current.value = JSON.stringify(siteUse(path, opened.current)); }}>
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      <LiveField label="Your name" name="name" value={name} onChange={setName} check={nameProblem} autoComplete="name" />
      <LiveField label="Phone" name="phone" type="tel" value={phone} onChange={setPhone} check={phoneProblem} autoComplete="tel" hint="10 digits. Used only to call you about this." />
      {!compact && <label className="afield"><span>Email <em>(optional)</em></span><input name="email" type="email" autoComplete="email" /></label>}
      {!compact && project && interests && interests.length > 0 && (
        <label className="afield"><span>Interested in <em>(optional)</em></span>
          <select name="interest" defaultValue={interest && interests.includes(interest) ? interest : ''}><option value="">Any size</option>{interests.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </label>
      )}

      {!compact && <p className="wide taps-intro"><strong>A little about your plans</strong> <em>(optional)</em>. It helps the right person call you, with the right answers.</p>}
      <WhenCards optional={compact} />
      {!compact && <Taps name="budget" label="Your budget" options={BUDGETS} />}
      {!compact && <Taps name="loan" label="How will you pay?" options={LOANS} />}
      {!compact && <Taps name="purpose" label="The home is" options={PURPOSES} />}
      <label className={`toggle wide ${visit ? 'is-on' : ''}`}>
        <span className="toggle-icon" aria-hidden="true">🚗</span>
        <span className="toggle-text"><strong>Arrange a site visit</strong><small>{visit ? 'We will ask which day suits you.' : 'Tick this if you would like to see it in person.'}</small></span>
        <input type="checkbox" name="wantsVisit" checked={visit} onChange={(e) => setVisit(e.target.checked)} />
        <span className="switch" aria-hidden="true" />
      </label>

      {!compact && <label className="afield wide"><span>Message <em>(optional)</em></span><textarea name="message" rows={2} maxLength={500} placeholder={callback ? 'e.g. I would like to visit this weekend' : 'e.g. Is the price negotiable? When can I visit?'} /></label>}
      <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <input type="hidden" name="signals" ref={signals} />
      <label className={`consent wide ${consent ? 'is-on' : ''}`}><input type="checkbox" name="consent" required checked={consent} onChange={(e) => setConsent(e.target.checked)} /> <span>{via === 'agent' ? `Share my name and phone number with a verified agent selling ${about}, and with this site’s team, so they can contact me.` : project
        ? unclaimed ? `I agree to be contacted by phone or email about ${about} by this site’s team, who may pass my enquiry to the builder.` : `I agree to be contacted by phone or email about ${about} by the builder and this site’s team.`
        : callback ? 'I agree to be contacted by phone or email about this home by its builder or this site’s team.'
          : 'Share my name and phone number with the seller so they can contact me about this home.'}</span></label>
      <p className="wide calc-note">{compact ? 'We also pass on a short note of how you used this site (pages opened, calculators used).' : 'With your enquiry we pass on your answers above and a short note of how you used this site (pages opened, calculators used), so you are called by someone who knows what you are looking for.'}</p>
      <div className="wide lead-send">
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={done} aria-label="Form progress"><span style={{ width: `${(done / 3) * 100}%` }} /></div>
        <p className="progress-text">{ready ? 'All set.' : [nameProblem(name) ? 'your name' : '', phoneProblem(phone) ? 'your phone number' : '', consent ? '' : 'the tick to agree'].filter(Boolean).join(', ').replace(/^./, (c) => `Still needed: ${c}`)}</p>
        <button type="submit" className={`auth-submit ${ready ? 'is-ready' : 'is-waiting'}`} disabled={pending}>
          {pending && <span className="spin" aria-hidden="true" />}
          {pending ? 'Sending…' : via === 'agent' ? 'Connect me' : callback ? 'Request a call back' : 'Get seller’s contact'}
        </button>
      </div>
    </form>
  );
}

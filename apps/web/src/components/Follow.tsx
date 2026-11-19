'use client';

import { useActionState, useState } from 'react';
import { followProject, type FollowState } from '@/app/(site)/actions';

/** "Tell me if this changes": one line that opens to an email box. We write only when the registration changes. */
export function Follow({ slug, name }: { slug: string; name: string }) {
  const [state, run, pending] = useActionState<FollowState, FormData>(followProject.bind(null, slug), {});
  const [open, setOpen] = useState(false);
  if (state.done) return <p className="follow is-done" role="status"><span aria-hidden="true">🔔</span> You are following {name}. We will email you only if its registration changes.</p>;
  return (
    <div className="follow">
      <span aria-hidden="true" className="follow-bell">🔔</span>
      <div className="follow-text"><strong>Get told if this changes</strong><span>An email if {name}’s registration lapses, is extended or reaches its end date. Nothing else.</span></div>
      {!open ? <button type="button" className="abtn quiet" onClick={() => setOpen(true)}>Follow this project</button> : (
        <form action={run} className="follow-form">
          {state.error && <p role="alert" className="aerror">{state.error}</p>}
          <input type="email" name="email" required autoFocus autoComplete="email" placeholder="Your email" aria-label="Your email" />
          <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <button type="submit" className="abtn" disabled={pending}>{pending ? 'Saving…' : 'Follow'}</button>
          <label className="follow-consent"><input type="checkbox" name="consent" required /> <span>Email me about changes to this project’s registration. Every email has a link to stop.</span></label>
        </form>
      )}
    </div>
  );
}

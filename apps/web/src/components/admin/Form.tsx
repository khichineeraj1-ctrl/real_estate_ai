'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/admin/actions';

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export function AdminForm({ action, submit, children }: { action: Action; submit: string; children: React.ReactNode }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="aform">
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      {children}
      <div className="aactions"><button type="submit" className="abtn" disabled={pending}>{pending ? 'Saving…' : submit}</button></div>
    </form>
  );
}

export function DeleteForm({ action, what }: { action: (state: FormState) => Promise<FormState>; what: string }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="adelete" onSubmit={(e) => { if (!window.confirm(`Delete ${what}? This cannot be undone.`)) e.preventDefault(); }}>
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      <button type="submit" className="abtn danger" disabled={pending}>{pending ? 'Deleting…' : `Delete ${what}`}</button>
    </form>
  );
}

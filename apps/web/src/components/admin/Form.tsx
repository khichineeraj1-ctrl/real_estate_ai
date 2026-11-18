'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/admin/actions';

type Action = (state: FormState, form: FormData) => Promise<FormState>;

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <p role="alert" className="aerror">{state.error}</p>}
      {state.ok && <p role="status" className="anotice">{state.ok}</p>}
      {state.rows && state.rows.length > 0 && (
        <div className="atable wide"><table>
          <thead><tr><th>Row in file</th><th>What to fix</th></tr></thead>
          <tbody>{state.rows.map((r) => <tr key={`${r.row}-${r.error}`}><td>{r.row}</td><td>{r.error}</td></tr>)}</tbody>
        </table></div>
      )}
    </>
  );
}

export function AdminForm({ action, submit, pendingLabel = 'Saving…', children }: { action: Action; submit: string; pendingLabel?: string; children: React.ReactNode }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="aform">
      <Messages state={state} />
      {children}
      <div className="aactions"><button type="submit" className="abtn" disabled={pending}>{pending ? pendingLabel : submit}</button></div>
    </form>
  );
}

/** A single button that runs an action, optionally after a confirmation, with its own error line. */
export function ActionButton({ action, label, confirm, tone = 'quiet', children }: { action: Action; label: string; confirm?: string; tone?: 'quiet' | 'danger' | 'primary'; children?: React.ReactNode }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="ainline" onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      <Messages state={state} />
      {children}
      <button type="submit" className={`abtn ${tone === 'primary' ? '' : tone}`} disabled={pending}>{pending ? 'Working…' : label}</button>
    </form>
  );
}

export function DeleteForm({ action, what }: { action: (state: FormState) => Promise<FormState>; what: string }) {
  return <div className="adelete"><ActionButton action={action} label={`Delete ${what}`} confirm={`Delete ${what}? This cannot be undone.`} tone="danger" /></div>;
}

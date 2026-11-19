'use client';

import { useActionState, useState } from 'react';
import { ArticleBody } from '@/components/ArticleBody';
import type { FormState } from '@/app/admin/actions';

interface Draft { kind: string; title: string; summary: string; body: string }
type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** Where a piece is written: the fields on the left, the page as buyers will see it on the right, updating as you type. */
export function ArticleEditor({ action, initial, locked, submit }: { action: Action; initial?: Partial<Draft>; locked?: boolean; submit: string }) {
  const [state, run, pending] = useActionState(action, {});
  const [d, setD] = useState<Draft>({ kind: initial?.kind ?? 'BLOG', title: initial?.title ?? '', summary: initial?.summary ?? '', body: initial?.body ?? '' });
  const set = (patch: Partial<Draft>) => setD((now) => ({ ...now, ...patch }));
  const words = d.body.trim() ? d.body.trim().split(/\s+/).length : 0;
  return (
    <div className="editor">
      <form action={run} className="editor-form">
        {state.error && <p role="alert" className="aerror">{state.error}</p>}
        {state.ok && <p role="status" className="anotice">{state.ok}</p>}
        <div className="picks" role="group" aria-label="Kind of piece">
          {[['BLOG', '📰 Blog post'], ['GUIDE', '📖 Guide']].map(([v, label]) => <button key={v} type="button" className="pick" aria-pressed={d.kind === v} disabled={locked} onClick={() => set({ kind: v })}>{label}</button>)}
        </div>
        <input type="hidden" name="kind" value={d.kind} />
        <label className="afield"><span>Title <em>({d.title.length}/90)</em></span><input name="title" required maxLength={90} value={d.title} readOnly={locked} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Five things to check on a site visit" /></label>
        <label className="afield"><span>Summary <em>({d.summary.length}/200)</em></span><textarea name="summary" required maxLength={200} rows={2} value={d.summary} readOnly={locked} onChange={(e) => set({ summary: e.target.value })} placeholder="One or two sentences. Shown on cards and in search results." /></label>
        <label className="afield"><span>The piece <em>({words.toLocaleString('en-IN')} words, about {Math.max(1, Math.round(words / 200))} min read)</em></span>
          <textarea name="body" required rows={22} className="editor-body" value={d.body} readOnly={locked} onChange={(e) => set({ body: e.target.value })} placeholder={'Start writing.\n\n## A heading\n\nA paragraph. Leave a blank line between paragraphs.\n\n- A point\n- Another point'} />
        </label>
        <details className="editor-help"><summary>Formatting</summary>
          <ul>
            <li><code>## Heading</code> starts a section.</li>
            <li><code>- point</code> at the start of a line makes a list.</li>
            <li>A blank line starts a new paragraph.</li>
            <li><code>**words**</code> makes them <strong>bold</strong>.</li>
            <li><code>[words](/tools/true-price)</code> or <code>[words](https://…)</code> makes a link.</li>
          </ul>
        </details>
        {!locked && <div className="aactions"><button type="submit" className="abtn" disabled={pending}>{pending ? 'Saving…' : submit}</button></div>}
      </form>
      <aside className="editor-preview" aria-label="Preview">
        <p className="editor-label">Preview · {d.kind === 'GUIDE' ? 'Guide' : 'Blog post'}</p>
        <h1>{d.title || 'Your title'}</h1>
        <p className="lead">{d.summary || 'Your summary appears here.'}</p>
        {d.body.trim() ? <ArticleBody body={d.body} /> : <p className="empty">The piece appears here as you write it.</p>}
      </aside>
    </div>
  );
}

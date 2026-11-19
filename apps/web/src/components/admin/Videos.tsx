import { ActionButton, AdminForm } from './Form';
import { Field } from './fields';
import type { FormState } from '@/app/admin/actions';

export interface AdminVideo { id: string; youtubeId: string; title: string | null }
type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** The videos of a home or project in the admin panel: what is there, and a box to add another YouTube link. */
export function Videos({ videos, add, remove, max = 6 }: { videos: AdminVideo[]; add: Action; remove: (id: string) => (state: FormState) => Promise<FormState>; max?: number }) {
  return (
    <section className="section" id="videos">
      <h2>Videos ({videos.length} of {max})</h2>
      <p className="lead">Paste the link of a video on YouTube: a walkthrough, the builder’s film, or a site update. It appears in the gallery under “Videos” and plays there. The video stays on YouTube; upload it to your own or the builder’s channel first.</p>
      {videos.length > 0 && (
        <ul className="aphotos">
          {videos.map((v) => (
            <li key={v.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`} alt={v.title ?? 'Video'} width={480} height={360} loading="lazy" referrerPolicy="no-referrer" />
              <small><a href={`https://www.youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer">{v.title || 'Watch on YouTube'}</a></small>
              <ActionButton action={remove(v.id)} label="Remove" confirm="Remove this video?" tone="danger" />
            </li>
          ))}
        </ul>
      )}
      {videos.length < max && (
        <AdminForm action={add} submit="Add video" pendingLabel="Adding…">
          <Field label="YouTube link" name="url" type="url" maxLength={200} hint="For example https://www.youtube.com/watch?v=… or https://youtu.be/…" />
          <Field label="Title" name="title" required={false} maxLength={120} hint="Optional: what the video shows, e.g. Sample flat walkthrough." />
        </AdminForm>
      )}
    </section>
  );
}

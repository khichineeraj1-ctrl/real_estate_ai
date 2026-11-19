import Link from 'next/link';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { ActionButton, AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { adminGet, getMe, isStaff } from '@/lib/admin';
import { decideArticle, removeArticle, saveArticle, submitArticle } from '../../../actions';

export const metadata = { title: 'Write' };

interface Article { id: string; slug: string; kind: string; title: string; summary: string; body: string; status: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'; reviewNote: string | null }
const STATUS = { DRAFT: 'Draft: only you and the team can see it', SUBMITTED: 'With the team for review', PUBLISHED: 'Published' };

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sent?: string; decided?: string }> }) {
  const [{ id }, sp, me] = await Promise.all([params, searchParams, getMe()]);
  const staff = isStaff(me.role);
  const fresh = id === 'new';
  const a = fresh ? null : await adminGet<Article>(`/articles/${id}`);
  const locked = !!a && a.status === 'PUBLISHED' && !staff;
  const address = a ? `/${a.kind === 'GUIDE' ? 'guides' : 'blog'}/${a.slug}` : '';
  return (
    <>
      <div className="ahead"><h1>{fresh ? 'Write a new piece' : a!.title}</h1><Link href="/admin/articles">← All pieces</Link></div>
      {a && <p className={`editor-status is-${a.status.toLowerCase()}`}><strong>{STATUS[a.status]}.</strong>{a.status === 'PUBLISHED' ? <> <Link href={address} target="_blank">View it on the site ↗</Link></> : ` It will be at ${address} once published.`}</p>}
      {sp.saved && <p role="status" className="anotice">Saved as a draft. Send it for review when it is ready.</p>}
      {sp.sent && <p role="status" className="anotice">Sent for review. An editor will publish it or send it back with a note.</p>}
      {sp.decided && <p role="status" className="anotice">{sp.decided === 'PUBLISH' ? 'Published.' : sp.decided === 'TAKE_DOWN' ? 'Taken down. It is a draft again.' : 'Sent back to the writer.'}</p>}
      {a?.reviewNote && a.status === 'DRAFT' && <p className="astatus"><strong>Sent back by the editor:</strong> {a.reviewNote}</p>}
      {locked && <p className="astatus">This piece is published, so it can no longer be changed here. Ask an editor to change it, or to take it down so you can.</p>}

      <ArticleEditor key={a?.id ?? 'new'} action={saveArticle.bind(null, a?.id ?? null)} initial={a ?? undefined} locked={locked} submit={fresh ? 'Save as a draft' : 'Save changes'} />

      {a && (
        <section className="editor-acts">
          {a.status === 'DRAFT' && <ActionButton action={submitArticle.bind(null, a.id)} label="Send for review" tone="primary" confirm="Send this piece to the team for review? Save your changes first." />}
          {staff && a.status !== 'PUBLISHED' && <AdminForm action={decideArticle.bind(null, a.id, 'PUBLISH')} submit="Publish" pendingLabel="Publishing…"><input type="hidden" name="note" value="" /></AdminForm>}
          {staff && a.status === 'SUBMITTED' && <AdminForm action={decideArticle.bind(null, a.id, 'SEND_BACK')} submit="Send back to the writer" pendingLabel="Saving…"><Field label="What should change" name="note" required={false} maxLength={400} /></AdminForm>}
          {staff && a.status === 'PUBLISHED' && <AdminForm action={decideArticle.bind(null, a.id, 'TAKE_DOWN')} submit="Take down" pendingLabel="Saving…"><Field label="Why (shown to the writer)" name="note" required={false} maxLength={400} /></AdminForm>}
          {(staff || a.status !== 'PUBLISHED') && <ActionButton action={removeArticle.bind(null, a.id)} label="Delete" tone="danger" confirm="Delete this piece for good?" />}
        </section>
      )}
    </>
  );
}

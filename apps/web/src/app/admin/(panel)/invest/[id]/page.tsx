import Link from 'next/link';
import { ActionButton, AdminForm, DeleteForm } from '@/components/admin/Form';
import { Area, Field, Select } from '@/components/admin/fields';
import { adminGet } from '@/lib/admin';
import { api } from '@/lib/api';
import { publishInvest, removeInvest, saveInvest } from '../../../actions';

export const metadata = { title: 'Investor corner: area' };
interface Edit { id: string; slug: string; title: string; driver: string; stateSlug: string; districts: string[]; summary: string; plan: string; stage: string; stageNote: string | null; authority: string | null; sourcesText: string; milestonesText: string; watch: string[]; staffNote: string | null; status: string; reviewedAt: string | null }
interface Options { notice: string; stages: { code: string; label: string; means: string }[]; drivers: { code: string; label: string }[] }

export default async function EditInvest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; done?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const fresh = id === 'new';
  const [a, o, land] = await Promise.all([fresh ? Promise.resolve(null) : adminGet<Edit>(`/invest/${id}`), api<Options>('/invest/options'), api<{ states: { slug: string; name: string }[] }>('/land/options')]);
  const live = a?.status === 'LIVE';
  return (
    <>
      <p><Link href="/admin/invest">← Investor corner</Link></p>
      <div className="ahead"><h1>{a ? a.title : 'Add an area'}</h1>{live && <Link className="abtn quiet" href={`/invest/${a!.slug}`} target="_blank">View live ↗</Link>}</div>
      {sp.saved && <p role="status" className="astatus">Saved as a draft. Publish it when the sources are in and you have checked the facts.</p>}
      {sp.done && <p role="status" className="astatus">{sp.done === 'LIVE' ? 'Published.' : sp.done === 'REVIEWED' ? 'Marked as checked today.' : 'Taken down. It is a draft again.'}</p>}
      <p className="astatus"><strong>Facts from the documents only.</strong> Say what is planned, who is in charge and how far along it is. No forecasts: words such as “guaranteed”, “prices will rise” or “20% returns” are refused. Readers are shown: “{o?.notice}”</p>

      {a?.staffNote && !live && <div className="land-refused" role="note"><strong>Check before publishing</strong><p style={{ whiteSpace: 'pre-wrap' }}>{a.staffNote}</p></div>}

      <AdminForm action={saveInvest.bind(null, a?.id ?? null)} submit={a ? 'Save' : 'Save as draft'}>
        <Field label="Title" name="title" defaultValue={a?.title} maxLength={120} hint="The plan’s own name, e.g. the airport, city or corridor." />
        <Select label="What is driving it" name="driver" defaultValue={a?.driver ?? 'CITY'} options={(o?.drivers ?? []).map((d) => ({ value: d.code, label: d.label }))} />
        <Select label="State" name="state" defaultValue={a?.stateSlug ?? ''} options={(land?.states ?? []).map((s) => ({ value: s.slug, label: s.name }))} />
        <Field label="Districts it touches" name="districts" required={false} defaultValue={a?.districts.join(', ')} hint="Separated by commas. Land listed in these districts is shown on the page." />
        <Field label="Authority in charge" name="authority" required={false} defaultValue={a?.authority} maxLength={120} />
        <Select label="Stage" name="stage" defaultValue={a?.stage ?? 'ANNOUNCED'} options={(o?.stages ?? []).map((s) => ({ value: s.code, label: `${s.label}: ${s.means}` }))} />
        <Field label="Stage note" name="stageNote" required={false} defaultValue={a?.stageNote} maxLength={240} hint="One line on what exists today, e.g. which phase is under construction." />
        <Area label="Summary" name="summary" rows={3} defaultValue={a?.summary} hint="Two or three sentences. Shown on the card. Up to 320 characters." />
        <Area label="What the plan says" name="plan" rows={8} defaultValue={a?.plan} hint="In plain words: size, what goes where, phases, who pays. One paragraph per line break." />
        <Area label="Dates the authority has given" name="milestones" rows={4} required={false} defaultValue={a?.milestonesText} hint="One per line as: When | What. e.g. 2027 | Phase 1 opening (authority’s target)" />
        <Area label="What to watch" name="watch" rows={4} required={false} defaultValue={a?.watch.join('\n')} hint="One risk or check per line, specific to this plan." />
        <Area label="Sources" name="sources" rows={4} required={false} defaultValue={a?.sourcesText} hint="One per line as: Name | https://… Official documents and pages only. At least one is needed to publish." />
        <Area label="Notes for staff (private)" name="staffNote" rows={5} required={false} defaultValue={a?.staffNote} hint="What still needs checking before this is published. Never shown to readers." />
      </AdminForm>

      {a && (
        <section className="section">
          <h2>{live ? 'Live' : 'Draft'}</h2>
          <p className="lead">{live ? `Facts last checked ${a.reviewedAt ? new Date(a.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'never'}. Readers see this date.` : 'Publishing records today as the date the facts were checked against the sources.'}</p>
          <div className="aactions">
            {!live && <ActionButton action={publishInvest.bind(null, a.id, 'LIVE')} label="Publish" tone="primary" confirm="Publish this? You are confirming every statement matches the linked sources today." />}
            {live && <ActionButton action={publishInvest.bind(null, a.id, 'REVIEWED')} label="I checked it again today" tone="primary" />}
            {live && <ActionButton action={publishInvest.bind(null, a.id, 'DRAFT')} label="Take down" />}
          </div>
          {!live && <DeleteForm action={removeInvest.bind(null, a.id)} what="this draft" />}
        </section>
      )}
    </>
  );
}

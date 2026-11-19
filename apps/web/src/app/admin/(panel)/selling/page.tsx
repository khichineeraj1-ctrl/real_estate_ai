import Link from 'next/link';
import { ActionButton, AdminForm } from '@/components/admin/Form';
import { Area, Select } from '@/components/admin/fields';
import { adminGet, getMe } from '@/lib/admin';
import { addSiteVideo, removeMySiteVideo, requestSelling, stopSelling } from '../../actions';
import { Field } from '@/components/admin/fields';

export const metadata = { title: 'Projects I sell' };

interface Item { id: string; status: 'REQUESTED' | 'APPROVED' | 'REJECTED'; note: string | null; decisionNote: string | null; createdAt: string; leads: number; project: { id: string; slug: string; name: string; builder: string; locality: { name: string; city: { name: string } } } }
interface Data { verified: boolean; kind: string | null; items: Item[] }
interface MyVideo { id: string; youtubeId: string; title: string | null; approved: boolean; projectId: string }
interface Found { id: string; name: string; builder: string; locality: { name: string; city: { name: string } } }

const STATUS = { REQUESTED: 'Waiting for our team', APPROVED: 'Approved: buyers can be connected to you', REJECTED: 'Not approved' };

export default async function Selling({ searchParams }: { searchParams: Promise<{ q?: string; asked?: string; removed?: string; videoSent?: string; videoRemoved?: string }> }) {
  const sp = await searchParams;
  const [me, d] = await Promise.all([getMe(), adminGet<Data>('/selling')]);
  const videos = me.role === 'AGENT' ? await adminGet<MyVideo[]>('/selling-videos') : [];
  const approved = d.items.filter((x) => x.status === 'APPROVED');
  const q = (sp.q ?? '').trim();
  const found = q.length >= 2 ? await adminGet<Found[]>(`/selling/projects?q=${encodeURIComponent(q)}`) : [];
  const mine = new Set(d.items.map((x) => x.project.id));
  const choices = found.filter((p) => !mine.has(p.id));
  return (
    <>
      <div className="ahead"><h1>Projects I sell</h1></div>
      <p className="lead">Tell us which builder projects you sell. Once our team approves a project, its cards show “Connect with a verified agent”, and buyers who press it are passed to you with their phone number and how strong the lead looks. Where several agents sell one project, leads are shared out in turn.</p>
      {sp.asked && <p role="status" className="astatus">Request sent. Our team will check it and you will see the result here.</p>}
      {sp.videoSent && <p role="status" className="astatus">Video sent. Our team will look at it, and it appears on the project once approved.</p>}
      {sp.videoRemoved && <p role="status" className="astatus">Video removed.</p>}
      {sp.removed && <p role="status" className="astatus">Removed. Leads already passed to you stay yours.</p>}

      {!d.verified ? (
        <p className="astatus"><strong>Get verified first.</strong> Buyers are only connected to agents whose identity and registration our team has checked. <Link href="/admin/verification">Complete your verification</Link>, and come back here once it is approved.</p>
      ) : d.kind === 'OWNER' ? (
        <p className="astatus">This is for agents and dealers. As an owner you can <Link href="/admin/properties/new">post your own home</Link> instead.</p>
      ) : (
        <>
          <h2>Add a project</h2>
          <form className="asearch" action="/admin/selling"><input type="search" name="q" defaultValue={q} placeholder="Type the project or builder name, e.g. Dahlias or DLF" aria-label="Find a project by name" /></form>
          {q.length >= 2 && choices.length === 0 && <p>No project matches “{q}”{found.length ? ' that you have not already added' : ''}. Try the builder’s name.</p>}
          {choices.length > 0 && (
            <AdminForm action={requestSelling} submit="Ask to sell this project" pendingLabel="Sending…">
              <Select label="Project" name="projectId" options={choices.map((p) => ({ value: p.id, label: `${p.name} — ${p.builder}, ${p.locality.name}, ${p.locality.city.name}` }))} />
              <Area label="How do you sell this project?" name="note" rows={2} required={false} hint="For example: authorised channel partner since 2024. Our team may ask to see the builder’s letter." />
            </AdminForm>
          )}
        </>
      )}

      <h2>Your projects</h2>
      {d.items.length === 0 ? <p>None yet.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Project</th><th>Where</th><th>Status</th><th>Leads passed to you</th><th><span className="sr">Remove</span></th></tr></thead>
          <tbody>
            {d.items.map((x) => (
              <tr key={x.id}>
                <td><Link href={`/projects/${x.project.slug}`}>{x.project.name}</Link><br /><small>{x.project.builder}</small></td>
                <td>{x.project.locality.name}, {x.project.locality.city.name}</td>
                <td className="awrap">{STATUS[x.status]}{x.decisionNote ? <><br /><small>{x.decisionNote}</small></> : null}</td>
                <td>{x.leads ? <Link href="/admin/enquiries">{x.leads}</Link> : 0}</td>
                <td><ActionButton action={stopSelling.bind(null, x.id)} label={x.status === 'APPROVED' ? 'Stop selling' : 'Remove'} confirm={`Remove ${x.project.name} from the projects you sell?`} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {approved.length > 0 && (
        <>
          <h2 id="videos">Site videos</h2>
          <p className="lead">Filmed a walk-through of a project you sell? Put it on YouTube and paste the link. Once our team approves it, it plays on the project’s page and on the home page’s new launches, with your name on it.</p>
          {approved.map((x) => {
            const mine = videos.filter((v) => v.projectId === x.project.id);
            return (
              <section key={x.id} className="acard">
                <h3>{x.project.name}</h3>
                {mine.length > 0 && (
                  <ul className="avideos">
                    {mine.map((v) => (
                      <li key={v.id}>
                        <a href={`https://www.youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer">{v.title ?? `youtu.be/${v.youtubeId}`}</a>
                        <span className={v.approved ? 'aok' : 'await'}>{v.approved ? 'Showing to buyers' : 'Waiting for our team'}</span>
                        <ActionButton action={removeMySiteVideo.bind(null, v.id)} label="Remove" confirm="Remove this video?" />
                      </li>
                    ))}
                  </ul>
                )}
                <AdminForm action={addSiteVideo.bind(null, x.id)} submit="Send video" pendingLabel="Sending…">
                  <Field label="YouTube link" name="url" hint="For example https://youtu.be/…" />
                  <Field label="Title" name="title" required={false} maxLength={120} hint="For example: Site walk-through, November 2026" />
                </AdminForm>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}

import Link from 'next/link';
import { ActionButton, AdminForm } from '@/components/admin/Form';
import { Area, Field, Select } from '@/components/admin/fields';
import { adminGet, getMe, isStaff } from '@/lib/admin';
import { api } from '@/lib/api';
import type { CitySummary } from '@/lib/types';
import { decideUpcoming, submitUpcoming, upcomingRegistered, withdrawUpcoming } from '../../actions';

export const metadata = { title: 'Upcoming projects' };

interface Mine { id: string; slug: string; name: string; builder: string; status: string; decisionNote: string | null; youtubeId: string | null; createdAt: string; projectId: string | null; locality: { name: string; city: { name: string } }; _count: { watches: number } }
interface Row extends Mine { about: string | null; expected: string | null; videoTitle: string | null; submittedBy: { name: string; email: string; role: string; dealer: { firmName: string | null } | null } | null; project: { slug: string; name: string } | null }
const STATUS: Record<string, string> = { PENDING: 'Waiting for our team', APPROVED: 'Showing to buyers', REJECTED: 'Not approved' };
const TABS = [['PENDING', 'Waiting'], ['APPROVED', 'Showing'], ['REJECTED', 'Turned down']] as const;
const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function Upcoming({ searchParams }: { searchParams: Promise<{ status?: string; sent?: string; removed?: string; saved?: string; told?: string }> }) {
  const sp = await searchParams;
  const me = await getMe();
  const staff = isStaff(me.role);
  const status = TABS.find(([v]) => v === sp.status)?.[0] ?? 'PENDING';
  const [cities, mine, rows] = await Promise.all([api<CitySummary[]>('/cities'), adminGet<Mine[]>('/upcoming/mine'), staff ? adminGet<Row[]>(`/upcoming?status=${status}`) : Promise.resolve([] as Row[])]);
  const groups = (cities ?? []).map((c) => ({ label: c.name, options: c.localities.map((l) => ({ value: `${c.slug}/${l.slug}`, label: l.name })) }));
  return (
    <>
      <div className="ahead"><h1>Upcoming projects</h1></div>
      <p className="lead">Tell buyers about a project that is coming but is not on a RERA register yet. It is shown as “not yet registered, not for sale”, with your name, and buyers can only ask to be told when it is registered.</p>
      {sp.sent && <p role="status" className="astatus">{staff ? 'Added.' : 'Sent. Our team will look at it, and you will see the result here.'}</p>}
      {sp.removed && <p role="status" className="astatus">Removed.</p>}
      {sp.saved && <p role="status" className="astatus">Saved.</p>}
      {sp.told != null && <p role="status" className="astatus">Linked to its registered page. {sp.told} buyer{sp.told === '1' ? ' was' : 's were'} told.</p>}

      <h2>Tell us about one</h2>
      <p className="astatus"><strong>No prices, offers or booking terms.</strong> A project that is not registered may not be priced, offered or booked, so text that mentions a price, an offer, a booking or returns is refused. Say only where it is and what is planned.</p>
      <AdminForm action={submitUpcoming} submit={staff ? 'Add' : 'Send to our team'} pendingLabel="Sending…">
        <Field label="Project name" name="name" maxLength={120} />
        <Field label="Builder" name="builder" maxLength={120} />
        <Select label="Locality" name="place" groups={groups} />
        <Field label="Expected launch" name="expected" required={false} maxLength={60} hint="In your words, e.g. Early 2027" />
        <Area label="What is planned" name="about" rows={3} required={false} hint="Where it is, how many towers, what kind of homes. No prices." />
        <Field label="Site video (YouTube link)" name="url" required={false} hint="Your own footage of the site, e.g. https://youtu.be/…" />
        <Field label="Video title" name="videoTitle" required={false} maxLength={120} hint="e.g. Site walk-through, November 2026" />
      </AdminForm>

      <h2>Yours</h2>
      {mine.length === 0 ? <p>None yet.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Project</th><th>Where</th><th>Status</th><th>Buyers waiting</th><th><span className="sr">Remove</span></th></tr></thead>
          <tbody>
            {mine.map((u) => (
              <tr key={u.id}>
                <td>{u.status === 'APPROVED' ? <Link href={`/upcoming/${u.slug}`}>{u.name}</Link> : u.name}<br /><small>{u.builder}{u.youtubeId ? ' · with video' : ''}</small></td>
                <td>{u.locality.name}, {u.locality.city.name}</td>
                <td className="awrap">{u.projectId ? 'Now registered' : STATUS[u.status]}{u.decisionNote ? <><br /><small>{u.decisionNote}</small></> : null}</td>
                <td>{u._count.watches}</td>
                <td><ActionButton action={withdrawUpcoming.bind(null, u.id)} label="Remove" confirm={`Remove ${u.name}? Buyers waiting to hear about it will not be told.`} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {staff && (
        <>
          <h2>Review</h2>
          <p className="lead">Approve only what you are satisfied is a real, planned project from someone who would know. Watch the video. Nothing here may carry a price or invite a booking. When the project appears on a register and has its page, mark it registered: everyone waiting is emailed once.</p>
          <p className="afilter">{TABS.map(([v, label]) => <Link key={v} href={`/admin/upcoming?status=${v}`} aria-current={status === v ? 'page' : undefined}>{label}</Link>)}</p>
          {rows.length === 0 ? <p>Nothing here.</p> : (
            <div className="atable"><table>
              <thead><tr><th>Project</th><th>What they said</th><th>Sent by</th><th>Decide</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}<br /><small>{u.builder} · {u.locality.name}, {u.locality.city.name}</small>{u.youtubeId ? <><br /><a href={`https://www.youtube.com/watch?v=${u.youtubeId}`} target="_blank" rel="noopener noreferrer">Watch the video ↗</a></> : null}</td>
                    <td className="awrap">{u.about ?? '—'}{u.expected ? <><br /><small>Expected: {u.expected}</small></> : null}</td>
                    <td>{u.submittedBy?.dealer?.firmName ?? u.submittedBy?.name ?? '—'}<br /><small>{u.submittedBy?.role === 'BUILDER' ? 'Builder' : u.submittedBy?.role === 'AGENT' ? 'Verified agent' : 'Staff'} · {u.submittedBy?.email} · {when(u.createdAt)}</small><br /><small>{u._count.watches} waiting</small></td>
                    <td>
                      {u.status !== 'APPROVED' && <AdminForm action={decideUpcoming.bind(null, u.id, 'APPROVED')} submit="Approve" pendingLabel="Saving…"><input type="hidden" name="note" value="" /></AdminForm>}
                      {u.status !== 'REJECTED' && <AdminForm action={decideUpcoming.bind(null, u.id, 'REJECTED')} submit={u.status === 'APPROVED' ? 'Take down' : 'Turn down'} pendingLabel="Saving…"><Field label="Reason, shown to the sender" name="note" required={false} maxLength={300} /></AdminForm>}
                      {u.status === 'APPROVED' && (u.project
                        ? <p>Registered as <Link href={`/projects/${u.project.slug}`}>{u.project.name}</Link></p>
                        : <AdminForm action={upcomingRegistered.bind(null, u.id)} submit="Mark registered and tell buyers" pendingLabel="Saving…"><Field label="Its registered page" name="projectSlug" hint="The end of the page address, e.g. m3m-altitude-sector-65-gurgaon" /></AdminForm>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </>
      )}
    </>
  );
}

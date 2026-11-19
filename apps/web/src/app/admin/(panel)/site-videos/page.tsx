import Link from 'next/link';
import { ActionButton } from '@/components/admin/Form';
import { adminGet, requireStaff } from '@/lib/admin';
import { approveSiteVideo, rejectSiteVideo } from '../../actions';

export const metadata = { title: 'Site videos from agents' };

interface Row { id: string; youtubeId: string; title: string | null; approved: boolean; createdAt: string; project: { id: string; slug: string; name: string; locality: { name: string; city: { name: string } } }; addedBy: { name: string; email: string; dealer: { firmName: string | null } | null } | null }
const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function SiteVideos({ searchParams }: { searchParams: Promise<{ status?: string; done?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const all = sp.status === 'all';
  const rows = await adminGet<Row[]>(`/site-videos${all ? '?status=all' : ''}`);
  return (
    <>
      <div className="ahead"><h1>Site videos from agents</h1></div>
      <p className="lead">Verified agents send in videos they filmed of projects they sell. Watch each one before approving: it should show the project named, be the agent’s own footage, and make no promise about price, returns or possession. An approved video plays on the project’s page and on the home page’s new launches, with the agent’s name.</p>
      {sp.done && <p role="status" className="astatus">Saved.</p>}
      <p className="afilter"><Link href="/admin/site-videos" aria-current={!all ? 'page' : undefined}>Waiting</Link><Link href="/admin/site-videos?status=all" aria-current={all ? 'page' : undefined}>All</Link></p>
      {rows.length === 0 ? <p>Nothing {all ? 'here' : 'waiting'}.</p> : (
        <div className="atable"><table>
          <thead><tr><th>Video</th><th>Project</th><th>Sent by</th><th>Decide</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="awrap"><a href={`https://www.youtube.com/watch?v=${r.youtubeId}`} target="_blank" rel="noopener noreferrer"><img src={`https://i.ytimg.com/vi/${r.youtubeId}/mqdefault.jpg`} alt="" width={160} height={90} referrerPolicy="no-referrer" /><br />{r.title ?? 'Watch on YouTube'} ↗</a></td>
                <td><Link href={`/projects/${r.project.slug}`}>{r.project.name}</Link><br /><small>{r.project.locality.name}, {r.project.locality.city.name}</small></td>
                <td>{r.addedBy?.dealer?.firmName ?? r.addedBy?.name ?? '—'}<br /><small>{r.addedBy?.email} · {when(r.createdAt)}</small></td>
                <td>
                  {r.approved ? <span className="aok">Showing</span> : <ActionButton action={approveSiteVideo.bind(null, r.id)} label="Approve" tone="primary" />}
                  <ActionButton action={rejectSiteVideo.bind(null, r.id)} label="Remove" tone="danger" confirm="Remove this video? The agent can send another." />
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );
}

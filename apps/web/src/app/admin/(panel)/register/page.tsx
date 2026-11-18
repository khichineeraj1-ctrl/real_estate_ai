import { projectPath } from '@/lib/seo';
import Link from 'next/link';
import { ActionButton } from '@/components/admin/Form';
import { type Options } from '@/components/admin/fields';
import { adminGet, getMe } from '@/lib/admin';
import { publishRegisterEntry, readRegister, unpublishRegisterEntry } from '../../actions';

export const metadata = { title: 'RERA registers' };

interface Run { id: string; source: string; startedAt: string; finishedAt: string | null; fetched: number; added: number; published: number; requests: number; note: string | null; error: string | null }
interface SourceInfo { source: string; name: string; url: string; covers: string[]; entries: number; published: number; running: boolean; lastRun: Run | null }
interface Entry {
  id: string; source: string; regNo: string; name: string; promoter: string; district: string; locationText: string; pincode: string | null; registerStatus: string | null; validUntil: string | null;
  sourceUrl: string; placedHow: string | null; project: { id: string; slug: string; locality: { name: string } } | null;
}
const CITY_OF: Record<string, string[]> = { HARYANA: ['Gurgaon'], KARNATAKA: ['Bengaluru'], MAHARASHTRA: ['Mumbai', 'Pune'] };
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export default async function Register({ searchParams }: { searchParams: Promise<{ source?: string; q?: string; placed?: string; page?: string; started?: string }> }) {
  const sp = await searchParams;
  const query = new URLSearchParams({ ...(sp.source ? { source: sp.source } : {}), ...(sp.q ? { q: sp.q } : {}), ...(sp.placed ? { placed: sp.placed } : {}) });
  const here = `/admin/register?${new URLSearchParams({ ...Object.fromEntries(query), ...(sp.page ? { page: sp.page } : {}) })}`;
  const [me, o, list, options] = await Promise.all([
    getMe(), adminGet<{ sources: SourceInfo[]; runs: Run[] }>('/register'),
    adminGet<{ items: Entry[]; total: number; page: number; pageSize: number }>(`/register/entries?${query}&page=${encodeURIComponent(sp.page ?? '1')}`), adminGet<Options>('/options'),
  ]);
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const link = (extra: Record<string, string>) => `/admin/register?${new URLSearchParams({ ...Object.fromEntries(query), ...extra })}`;
  const tab = (key: string, value: string, label: string) => {
    const q = new URLSearchParams(query); if (value) q.set(key, value); else q.delete(key);
    return <Link href={`/admin/register?${q}`} aria-current={(sp[key as 'source' | 'placed'] ?? '') === value ? 'page' : undefined}>{label}</Link>;
  };
  return (
    <>
      <h1>RERA registers</h1>
      <p className="lead">
        Projects as the state regulators publish them: name, builder, registration number, location and dates. Entries we can place in one of our localities become project pages, marked as coming from the register and not yet confirmed by the builder. The registers have no prices or photos.
      </p>
      {sp.started && <p role="status" className="anotice">Reading has started in the background. Refresh this page in a minute to see the result.</p>}

      <div className="atable"><table>
        <thead><tr><th>Register</th><th>Covers</th><th>Entries held</th><th>Project pages</th><th>Last read</th><th><span className="sr">Actions</span></th></tr></thead>
        <tbody>
          {o.sources.map((s) => (
            <tr key={s.source}>
              <td><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></td><td>{CITY_OF[s.source].join(', ')}</td><td>{s.entries.toLocaleString('en-IN')}</td><td>{s.published.toLocaleString('en-IN')}</td>
              <td className="awrap">
                {s.running ? 'Reading now…' : s.lastRun ? (
                  <>{when(s.lastRun.startedAt)}: {s.lastRun.error ? <span className="alead-msg error">stopped: {s.lastRun.error}</span> : `${s.lastRun.fetched.toLocaleString('en-IN')} read in ${s.lastRun.requests} request${s.lastRun.requests === 1 ? '' : 's'}, ${s.lastRun.added.toLocaleString('en-IN')} new, ${s.lastRun.published} pages made`}{s.lastRun.note ? <><br /><small>{s.lastRun.note}</small></> : null}</>
                ) : 'Never'}
              </td>
              <td>
                {me.role === 'ADMIN' && !s.running && (
                  <ActionButton action={readRegister.bind(null, s.source)} label="Read now" confirm={`Read the ${s.name} register now? It is read politely, one page at a time, and can take a few minutes.`}>
                    {s.source === 'MAHARASHTRA' && <input type="hidden" name="maxPages" value="5" />}
                  </ActionButton>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h2 className="section">Entries</h2>
      <p className="afilter">{tab('source', '', 'All registers')}{o.sources.map((s) => <span key={s.source}>{tab('source', s.source, s.name)}</span>)}</p>
      <p className="afilter">{tab('placed', '', 'All')}{tab('placed', 'no', 'Not placed yet')}{tab('placed', 'yes', 'Have a project page')}</p>
      <form className="asearch" role="search">
        {sp.source && <input type="hidden" name="source" value={sp.source} />}{sp.placed && <input type="hidden" name="placed" value={sp.placed} />}
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Project, builder, number or location" aria-label="Search register entries" />
        <button type="submit" className="abtn quiet">Search</button>
      </form>
      <p>{list.total.toLocaleString('en-IN')} {list.total === 1 ? 'entry' : 'entries'}</p>
      {list.items.length > 0 && (
        <div className="atable"><table>
          <thead><tr><th>Project</th><th>Builder</th><th>Where the register says</th><th>Registration</th><th>Project page</th></tr></thead>
          <tbody>
            {list.items.map((e) => (
              <tr key={e.id}>
                <td><a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">{e.name}</a>{/lapsed/i.test(e.registerStatus ?? '') && <><br /><span className="alead-msg error">Lapsed</span></>}</td>
                <td className="awrap">{e.promoter}</td>
                <td className="awrap">{e.locationText}{e.pincode ? `, ${e.pincode}` : ''}<br /><small>{e.district}</small></td>
                <td className="awrap"><small>{e.regNo}</small>{e.validUntil && <><br />to {new Date(e.validUntil).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</>}</td>
                <td className="awrap">
                  {e.project ? (
                    <>
                      <Link href={projectPath(e.project)}>In {e.project.locality.name}</Link><br /><small>{e.placedHow}</small>
                      <ActionButton action={unpublishRegisterEntry.bind(null, e.id, here)} label="Take page down" confirm={`Take down the project page for ${e.name}?`} tone="danger" />
                    </>
                  ) : (
                    <ActionButton action={publishRegisterEntry.bind(null, e.id, here)} label="Make page">
                      <select name="localityId" required defaultValue="" aria-label={`Locality for ${e.name}`}>
                        <option value="">Place in…</option>
                        {options.cities.filter((c) => CITY_OF[e.source].includes(c.name)).map((c) => <optgroup key={c.id} label={c.name}>{c.localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>)}
                      </select>
                    </ActionButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {pages > 1 && <p className="apager">{list.page > 1 && <Link href={link({ page: String(list.page - 1) })}>← Previous</Link>} Page {list.page} of {pages} {list.page < pages && <Link href={link({ page: String(list.page + 1) })}>Next →</Link>}</p>}
    </>
  );
}

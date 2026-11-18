import { API_URL, sessionToken } from '@/lib/admin';

const go = (location: string) => new Response(null, { status: 303, headers: { location } });
const back = (query: string) => go(`/admin/verification?${query}#documents`);

/** Receives a verification document from the seller's verification page and passes it to the API, which checks the session, the file type and the size. */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return new Response('Forbidden', { status: 403 });
  const token = await sessionToken();
  if (!token) return go('/admin/login');
  let form: FormData;
  try { form = await req.formData(); } catch { return back(`error=${encodeURIComponent('The upload could not be read. Try again with a smaller file.')}`); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return back(`error=${encodeURIComponent('Choose a file')}`);
  const out = new FormData();
  out.append('kind', String(form.get('kind') ?? ''));
  out.append('file', file, 'document');
  const res = await fetch(`${API_URL}/admin/dealer/documents`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: out }).catch(() => null);
  if (!res) return back(`error=${encodeURIComponent('The API is not reachable. Check that it is running.')}`);
  if (res.status === 401) return go('/admin/login');
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return back(`error=${encodeURIComponent(res.status === 413 ? 'Each document must be under 5 MB' : data?.message || 'The document could not be saved')}`);
  }
  return back('uploaded=1');
}

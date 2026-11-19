import { revalidatePath } from 'next/cache';
import { API_URL, sessionToken } from '@/lib/admin';

const go = (location: string) => new Response(null, { status: 303, headers: { location } });

/** Receives the photo form from a project's edit page and passes the files to the API, which checks the session, the role and file types. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]+$/i.test(id)) return new Response('Not found', { status: 404 });
  const back = (query: string) => go(`/admin/projects/${id}?${query}#photos`);

  // Only this site's own pages may post here.
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return new Response('Forbidden', { status: 403 });
  const token = await sessionToken();
  if (!token) return go('/admin/login');

  let files: File[];
  let category = '';
  try {
    const form = await req.formData();
    files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    category = String(form.get('category') ?? '');
  } catch {
    return back(`error=${encodeURIComponent('The upload could not be read. Try again with smaller files.')}`);
  }
  if (!files.length) return back(`error=${encodeURIComponent('Choose at least one photo')}`);

  const out = new FormData();
  for (const f of files) out.append('photos', f, 'photo');
  if (category) out.append('category', category); // what these photos show; the API accepts only its own list
  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin/projects/${id}/photos`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: out });
  } catch {
    return back(`error=${encodeURIComponent('The API is not reachable. Check that it is running.')}`);
  }
  if (res.status === 401) return go('/admin/login');
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    const message = res.status === 413 ? 'Each photo must be under 5 MB' : data?.message || 'The photos could not be saved';
    return back(`error=${encodeURIComponent(message)}`);
  }
  revalidatePath('/', 'layout');
  return back(`photos=${files.length}`);
}

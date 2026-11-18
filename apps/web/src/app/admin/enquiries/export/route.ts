import { API_URL, sessionToken } from '@/lib/admin';

/** Downloads enquiries as a CSV file, optionally for one project (?project=) or one kind (?kind=). The API only gives it to staff. */
export async function GET(req: Request) {
  const token = await sessionToken();
  const from = new URL(req.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ['project', 'kind']) { const v = from.get(key); if (v) query.set(key, v); }
  const res = token ? await fetch(`${API_URL}/admin/enquiries.csv?${query}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null) : null;
  if (!res?.ok) return new Response(null, { status: 303, headers: { location: res?.status === 403 ? '/admin' : '/admin/login' } });
  const day = new Date().toISOString().slice(0, 10);
  // The byte-order mark makes Excel read names in Indian scripts correctly.
  return new Response('\uFEFF' + (await res.text()), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="leads-${day}.csv"`, 'cache-control': 'no-store' } });
}

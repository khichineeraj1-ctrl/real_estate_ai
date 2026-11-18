import { API_URL, sessionToken } from '@/lib/admin';

/** Downloads the example import file. The API only gives it to signed-in staff. */
export async function GET() {
  const token = await sessionToken();
  const res = token ? await fetch(`${API_URL}/admin/import/sample.csv`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null) : null;
  if (!res?.ok) return new Response(null, { status: 303, headers: { location: '/admin/login' } });
  return new Response(await res.text(), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="listings-sample.csv"' } });
}

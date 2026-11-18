import { API_URL, sessionToken } from '@/lib/admin';

/** Shows one verification document to the seller it belongs to or to staff. The API decides who may see it; nothing is cached. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await sessionToken();
  if (!token) return new Response(null, { status: 303, headers: { location: '/admin/login' } });
  const res = await fetch(`${API_URL}/admin/documents/${encodeURIComponent(id)}/file`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return new Response('Document not found', { status: res?.status === 401 ? 401 : 404 });
  return new Response(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream', 'content-disposition': res.headers.get('content-disposition') ?? 'inline',
      'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex',
    },
  });
}

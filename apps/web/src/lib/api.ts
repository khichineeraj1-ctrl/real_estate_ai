import 'server-only';

const API_URL = process.env.API_URL || 'http://localhost:4100';

/** Server-side call to the API. Returns null for "not found" so pages can answer with a real 404. */
export async function api<T>(path: string, init?: RequestInit & { revalidate?: number }): Promise<T | null> {
  const { revalidate = 120, ...rest } = init ?? {};
  const res = await fetch(`${API_URL}${path}`, rest.method && rest.method !== 'GET' ? { ...rest, cache: 'no-store' } : { ...rest, next: { revalidate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} answered ${res.status}`);
  return (await res.json()) as T;
}

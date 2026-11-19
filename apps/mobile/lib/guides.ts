import { API_URL } from './config';

export interface GuideCard { slug: string; title: string; short: string; summary: string; icon: string; minutes: number }
export interface Guide extends GuideCard { takeaways: string[]; sections: { heading: string; paras: string[]; bullets?: string[] }[]; tool?: { app: string; label: string }; faqs: { q: string; a: string }[]; reviewed: string; more: GuideCard[] }

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`).catch(() => null);
  if (!res?.ok) throw new Error(res?.status === 404 ? 'That guide was not found.' : 'The guides could not be loaded. Check your connection.');
  return (await res.json()) as T;
}
export const getGuides = () => get<GuideCard[]>('/guides');
export const getGuide = (slug: string) => get<Guide>(`/guides/${slug}`);

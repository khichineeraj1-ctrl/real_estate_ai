import { pageMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { AskBox } from '@/components/AskBox';
import { api } from '@/lib/api';
import type { AskResult } from '@/lib/types';

type Props = { searchParams: Promise<{ q?: string | string[] }> };
const question = async (sp: Props['searchParams']) => { const q = (await sp).q; return (Array.isArray(q) ? q[0] : q ?? '').trim().slice(0, 300); };

// Answers are endless variations of the same listings, so they stay out of the index and pass crawlers on to the real pages.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = await question(searchParams);
  return pageMeta({ title: q ? `${q} — answer` : 'Ask about homes for sale', description: 'Ask about homes and builder projects in your own words, by typing or by voice, and get a direct answer.', path: '/ask', noindex: true });
}

export default async function AskPage({ searchParams }: Props) {
  const q = await question(searchParams);
  let initial: { question: string; result: AskResult } | undefined;
  if (q) {
    const visitor = (await headers()).get('x-forwarded-for')?.split(',')[0].trim();
    const result = await api<AskResult>('/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: q, visitor }) });
    if (result) initial = { question: q, result };
  }
  return (
    <>
      <h1>Ask about homes for sale</h1>
      <p className="lead">Ask in your own words, by typing or with the microphone. Follow-up questions keep the context.</p>
      <AskBox key={q} initial={initial} autoFocus={!q} placeholder={q ? 'Ask a follow-up' : undefined} />
    </>
  );
}

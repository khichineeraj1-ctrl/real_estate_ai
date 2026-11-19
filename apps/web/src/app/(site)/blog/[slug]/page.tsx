import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArticlePage, articlePath, type Article } from '@/components/ArticlePage';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;
const load = async (params: Props['params']) => api<Article>(`/articles/${(await params).slug}`, { revalidate: 300 });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load(params);
  return a ? pageMeta({ title: a.title, description: a.summary, path: articlePath(a) }) : {};
}

export default async function BlogPost({ params }: Props) {
  const a = await load(params);
  if (!a) notFound();
  if (a.kind !== 'BLOG') permanentRedirect(articlePath(a)); // a guide lives under /guides
  return <ArticlePage a={a} />;
}

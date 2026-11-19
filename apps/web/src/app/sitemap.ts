import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SITE_URL, configSlug } from '@/lib/seo';
import type { SitemapData } from '@/lib/types';

export const dynamic = 'force-dynamic';

// One file for now; split with generateSitemaps() before it reaches 50,000 URLs.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await api<SitemapData>('/sitemap');
  if (!data) return [{ url: SITE_URL }];
  const guides = (await api<{ slug: string }[]>('/guides')) ?? [];
  const land = await api<{ states: { slug: string; districts: { slug: string }[] }[] }>('/land/places');
  const landList = await api<{ items: { slug: string }[] }>('/land?take=60');
  const [posts, writtenGuides] = await Promise.all([api<{ slug: string }[]>('/articles?kind=BLOG'), api<{ slug: string }[]>('/articles?kind=GUIDE')]);
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/post-property`, changeFrequency: 'monthly', priority: 0.5 },
    ...['/tools', '/tools/emi-calculator', '/tools/home-affordability', '/tools/cost-of-buying', '/tools/true-price', '/tools/delay-cost', '/tools/land-area'].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...['/land', '/land/wanted', '/land/post', '/land/wanted/post'].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...(land?.states ?? []).flatMap((s) => [{ url: `${SITE_URL}/land/${s.slug}`, changeFrequency: 'daily' as const, priority: 0.7 }, ...s.districts.map((d) => ({ url: `${SITE_URL}/land/${s.slug}/${d.slug}`, changeFrequency: 'daily' as const, priority: 0.7 }))]),
    ...(landList?.items ?? []).map((l) => ({ url: `${SITE_URL}/land/listing/${l.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    { url: `${SITE_URL}/new-launches`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${SITE_URL}/guides`, changeFrequency: 'monthly' as const, priority: 0.6 },
    ...guides.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...(writtenGuides ?? []).map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly' as const, priority: 0.6 },
    ...(posts ?? []).map((g) => ({ url: `${SITE_URL}/blog/${g.slug}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...(data.comparisons ?? []).map((c) => ({ url: `${SITE_URL}/${c.city}/compare/${c.pair}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...data.cities.map((c) => ({ url: `${SITE_URL}/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.9 })),
    ...data.cities.flatMap((c) => c.localities.map((l) => ({ url: `${SITE_URL}/${c.slug}/${l}`, changeFrequency: 'daily' as const, priority: 0.8 }))),
    ...data.configs.map((c) => ({ url: `${SITE_URL}/${c.city}/${c.locality}/${configSlug(c.bhk)}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    { url: `${SITE_URL}/builders`, changeFrequency: 'weekly' as const, priority: 0.6 },
    ...(data.builders ?? []).map((b) => ({ url: `${SITE_URL}/builders/${b.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...(data.builderCities ?? []).map((b) => ({ url: `${SITE_URL}/${b.city}/${b.builder}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...data.projects.map((p) => ({ url: `${SITE_URL}/${p.city}/${p.builder}/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...data.properties.map((p) => ({ url: `${SITE_URL}/property/${p.slug}`, lastModified: new Date(p.postedAt), priority: 0.6 })),
  ];
}

import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SITE_URL, configSlug } from '@/lib/seo';
import type { SitemapData } from '@/lib/types';

export const dynamic = 'force-dynamic';

// One file for now; split with generateSitemaps() before it reaches 50,000 URLs.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await api<SitemapData>('/sitemap');
  if (!data) return [{ url: SITE_URL }];
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/post-property`, changeFrequency: 'monthly', priority: 0.5 },
    ...['/tools', '/tools/emi-calculator', '/tools/home-affordability', '/tools/cost-of-buying'].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...(data.comparisons ?? []).map((c) => ({ url: `${SITE_URL}/${c.city}/compare/${c.pair}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...data.cities.map((c) => ({ url: `${SITE_URL}/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.9 })),
    ...data.cities.flatMap((c) => c.localities.map((l) => ({ url: `${SITE_URL}/${c.slug}/${l}`, changeFrequency: 'daily' as const, priority: 0.8 }))),
    ...data.configs.map((c) => ({ url: `${SITE_URL}/${c.city}/${c.locality}/${configSlug(c.bhk)}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...data.projects.map((p) => ({ url: `${SITE_URL}/projects/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...data.properties.map((p) => ({ url: `${SITE_URL}/property/${p.slug}`, lastModified: new Date(p.postedAt), priority: 0.6 })),
  ];
}

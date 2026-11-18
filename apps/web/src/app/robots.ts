import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** Only production (ALLOW_INDEXING=true) invites crawlers, so staging and local copies never end up in search results. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING !== 'true') return { rules: [{ userAgent: '*', disallow: '/' }] };
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/ask?'] }], sitemap: `${SITE_URL}/sitemap.xml` };
}

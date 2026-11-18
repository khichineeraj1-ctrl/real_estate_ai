import brand from '../../../../brand.json';

export const BRAND = brand.name;
export const TAGLINE = brand.tagline;
export const SITE_URL = (process.env.SITE_URL || 'http://localhost:3210').replace(/\/$/, '');
export const abs = (path: string) => `${SITE_URL}${path}`;

export const configSlug = (bhk: number) => `${bhk}-bhk-flats`;
export const parseConfig = (slug: string) => { const m = /^([1-6])-bhk-flats$/.exec(slug); return m ? Number(m[1]) : null; };

/** The one address for a comparison of two localities: the pair is always written alphabetically. */
/** A project's address: city, then builder, then project. A project with no builder page yet keeps the old address, which still opens it. */
export const projectPath = (city: string, p: { slug: string; brand?: { slug: string } | null }) => (p.brand ? `/${city}/${p.brand.slug}/${p.slug}` : `/projects/${p.slug}`);
/** A builder's page for one city: its projects there. */
export const builderPath = (city: string, builder: string) => `/${city}/${builder}`;
export const comparePath = (city: string, a: string, b: string) => `/${city}/compare/${[a, b].sort().join('-vs-')}`;

export interface Crumb { name: string; path: string }
export const breadcrumbLd = (crumbs: Crumb[]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
});
export const itemListLd = (name: string, items: { slug: string; title: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: items.length,
  itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: abs(`/property/${p.slug}`) })),
});
export const faqLd = (faqs: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

/** Address of a stored listing photo on this site. */
/** `card` is the small 640px version used in listings; the default is the full photo (up to 1600px). */
export const media = (file: string, size: 'full' | 'card' = 'full') => `/media/${size === 'card' ? file.replace(/\.webp$/, '-card.webp') : file}`;

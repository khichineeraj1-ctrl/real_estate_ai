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

/** Search results cut a title at about 60 characters and a description at about 155. */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;
const clamp = (s: string, max: number) => { if (s.length <= max) return s; const cut = s.slice(0, max - 1); return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[\s,;:—-]+$/, '')}…`; };

/**
 * Everything a page tells search engines and link previews about itself, from one title, one description and its
 * address: the canonical address, Open Graph and X card tags, and a share picture drawn from the title.
 * The brand is added to the title only when the two fit in what a search result shows.
 */
export function pageMeta(o: { title: string; description: string; path: string; image?: string; noindex?: boolean; type?: 'website' | 'article' }) {
  const withBrand = `${o.title} | ${BRAND}`;
  const description = clamp(o.description, DESCRIPTION_MAX);
  const short = o.title.split(' — ')[0];
  const image = o.image ?? `/og?t=${encodeURIComponent(short)}&s=${encodeURIComponent(clamp(o.description, 110))}`;
  return {
    // Too long with the brand: drop the brand. Still too long: keep the part before the dash rather than cut mid-phrase.
    title: withBrand.length <= TITLE_MAX ? o.title : { absolute: o.title.length <= TITLE_MAX ? o.title : clamp(short, TITLE_MAX) },
    description,
    alternates: { canonical: o.path },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: o.title, description, url: o.path, siteName: BRAND, locale: 'en_IN', type: o.type ?? ('website' as const), images: [{ url: image, width: 1200, height: 630, alt: short }] },
    twitter: { card: 'summary_large_image' as const, title: o.title, description, images: [image] },
  };
}

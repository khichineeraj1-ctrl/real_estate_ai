import type { Metadata, Viewport } from 'next';
import { BRAND, SITE_URL, TAGLINE } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND} — ${TAGLINE}`, template: `%s | ${BRAND}` },
  description: 'Ask in your own words, by typing or by voice, and get a direct answer with matching flats, villas and plots for sale in Gurgaon, Bengaluru, Mumbai and Pune.',
  openGraph: { siteName: BRAND, type: 'website', locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0e1116' }, { color: '#ffffff' }] };

// The public site and the admin panel each add their own header inside this shell.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}

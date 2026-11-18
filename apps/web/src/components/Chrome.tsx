import Link from 'next/link';
import { api } from '@/lib/api';
import { BRAND, TAGLINE } from '@/lib/seo';
import type { CitySummary } from '@/lib/types';

export async function Header() {
  const cities = (await api<CitySummary[]>('/cities')) ?? [];
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="logo"><span className="orb" aria-hidden="true" />{BRAND}</Link>
        <nav aria-label="Cities">{cities.map((c) => <Link key={c.slug} href={`/${c.slug}`}>{c.name}</Link>)}</nav>
        <Link href="/ask" className="ask-link">Ask</Link>
      </div>
    </header>
  );
}

/** Every city and locality is linked from every page, so crawlers reach each listing page within three clicks of any other. */
export async function Footer() {
  const cities = (await api<CitySummary[]>('/cities')) ?? [];
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-cols">
          {cities.map((c) => (
            <div key={c.slug}>
              <h2><Link href={`/${c.slug}`}>Property in {c.name}</Link></h2>
              <ul>{c.localities.map((l) => <li key={l.slug}><Link href={`/${c.slug}/${l.slug}`}>{l.name}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <p className="fine">{BRAND} — {TAGLINE}. Listings shown here are sample data for development.</p>
      </div>
    </footer>
  );
}

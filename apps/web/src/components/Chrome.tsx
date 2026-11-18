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
        <Link href="/builders" className="post-link">Builders</Link>
        <Link href="/tools" className="post-link">Tools</Link>
        <Link href="/post-property" className="post-link">Post property</Link>
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
        <p className="fine"><Link href="/builders">Builders and developers</Link> · <Link href="/tools">Home buying tools</Link> · <Link href="/tools/emi-calculator">EMI calculator</Link> · <Link href="/tools/home-affordability">How much can I afford?</Link> · <Link href="/tools/cost-of-buying">True cost of buying</Link> · <Link href="/compare" rel="nofollow">Compare homes</Link></p>
        <p className="fine"><Link href="/post-property">Post your property</Link> · <Link href="/admin/login" rel="nofollow">Sign in</Link></p>
        <p className="fine">{BRAND} — {TAGLINE}. Builder projects are taken from the public RERA registers; homes are listed by owners, agents and builders.</p>
      </div>
    </footer>
  );
}

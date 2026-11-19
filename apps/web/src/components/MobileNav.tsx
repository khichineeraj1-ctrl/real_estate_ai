'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface City { slug: string; name: string }
const LINKS: { title: string; items: [string, string, string][] }[] = [
  { title: 'Find', items: [['/new-launches', 'New launches', '🚀'], ['/builders', 'Builders', '🏢'], ['/land', 'Land and warehouses', '🌾'], ['/invest', 'Investor corner', '📈'], ['/compare', 'Compare', '⇄']] },
  { title: 'Decide', items: [['/tools', 'Tools and calculators', '🧮'], ['/guides', 'Guides', '📖'], ['/blog', 'Blog', '📰']] },
  { title: 'You', items: [['/account', 'My account', '♡'], ['/post-property', 'Post a property', '➕']] },
];

/** On a phone the header's links fold into this: a button that opens a full-height menu from the right. */
export function MobileMenu({ cities }: { cities: City[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { dialog.current?.close(); }, [path]); // choosing a page closes the menu
  const show = () => { setOpen(true); requestAnimationFrame(() => dialog.current?.showModal()); };
  return (
    <>
      <button type="button" className="menu-btn" aria-label="Menu" aria-haspopup="dialog" onClick={show}><span aria-hidden="true" /></button>
      {open && (
        <dialog ref={dialog} className="menu-sheet" aria-label="Menu" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
          <div className="menu-in">
            <div className="menu-top"><strong>Menu</strong><button type="button" className="menu-close" aria-label="Close menu" onClick={() => dialog.current?.close()}>×</button></div>
            <Link href="/ask" className="menu-ask"><span aria-hidden="true">✨</span>Ask a question</Link>
            {LINKS.map((g) => (
              <div key={g.title} className="menu-group">
                <p>{g.title}</p>
                {g.items.map(([href, label, icon]) => <Link key={href} href={href} aria-current={path === href || path.startsWith(`${href}/`) ? 'page' : undefined}><span aria-hidden="true">{icon}</span>{label}<i aria-hidden="true">›</i></Link>)}
              </div>
            ))}
            <div className="menu-group">
              <p>Cities</p>
              <div className="menu-cities">{cities.map((c) => <Link key={c.slug} href={`/${c.slug}`} aria-current={path === `/${c.slug}` ? 'page' : undefined}>{c.name}</Link>)}</div>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /></>,
  compare: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  tools: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6M9 13h2M13 13h2M9 17h2M13 17h2" /></>,
  guides: <><path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z" /><path d="M9 9h5M9 13h5" /></>,
  account: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1-4 4-5.5 7-5.5s6 1.500 7 5.5" /></>,
};
const TABS: [string, string, string][] = [['/', 'Home', 'home'], ['/compare', 'Compare', 'compare'], ['/tools', 'Tools', 'tools'], ['/guides', 'Guides', 'guides'], ['/account', 'Account', 'account']];

/** The bar along the bottom of a phone screen, as in an app: five places, the current one marked. */
export function TabBar() {
  const path = usePathname();
  const on = (href: string) => (href === '/' ? path === '/' || path === '/ask' : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(([href, label, icon]) => (
        <Link key={href} href={href} aria-current={on(href) ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[icon]}</svg>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

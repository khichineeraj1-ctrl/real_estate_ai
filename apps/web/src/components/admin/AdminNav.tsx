'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface NavItem { href: string; label: string; icon: string }
export interface NavGroup { title: string; items: NavItem[] }

/**
 * The admin's side menu: sections in groups, the current one marked. On a phone it is tucked behind a Menu button and
 * closes when a section is chosen. The API decides what an account may do; this list only reflects it.
 */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const query = useSearchParams().toString();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path, query]);
  // The section whose address is the longest match for where we are; a link with a filter wins when that filter is on.
  const all = groups.flatMap((g) => g.items);
  const score = (href: string) => {
    const [p, q] = href.split('?');
    if (!(path === p || (p !== '/admin' && path.startsWith(`${p}/`)))) return -1;
    if (q) return query.includes(q) ? p.length + 100 : -1;
    return p.length;
  };
  const current = all.reduce<NavItem | null>((best, x) => (score(x.href) > (best ? score(best.href) : -1) ? x : best), null);
  return (
    <>
      <button type="button" className="aside-toggle" aria-expanded={open} aria-controls="aside-nav" onClick={() => setOpen((v) => !v)}><span aria-hidden="true">☰</span> Menu{current ? `: ${current.label}` : ''}</button>
      <nav id="aside-nav" className={`aside-nav ${open ? 'is-open' : ''}`} aria-label="Sections">
        {groups.map((g) => (
          <div key={g.title} className="aside-group">
            <p>{g.title}</p>
            {g.items.map((x) => (
              <Link key={x.href} href={x.href} aria-current={current?.href === x.href ? 'page' : undefined}><span aria-hidden="true">{x.icon}</span>{x.label}</Link>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

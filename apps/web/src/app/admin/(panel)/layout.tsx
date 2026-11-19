import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe, isStaff, sessionToken } from '@/lib/admin';
import { BRAND } from '@/lib/seo';
import { Suspense } from 'react';
import { AdminNav, type NavGroup, type NavItem } from '@/components/admin/AdminNav';
import { ActionButton } from '@/components/admin/Form';
import { logout, resendVerification } from '../actions';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await sessionToken())) redirect('/admin/login');
  const me = await getMe(); // the API confirms the session and the role; the menu below only reflects it
  const staff = isStaff(me.role);
  const builder = me.role === 'BUILDER';
  const writer = me.role === 'WRITER';
  const item = (href: string, label: string, icon: string): NavItem => ({ href, label, icon });
  const groups: NavGroup[] = writer ? [{ title: 'Writing', items: [item('/admin', 'Overview', '🏠'), item('/admin/articles', 'Guides and blog', '✍️'), item('/admin/articles/new', 'Write a new piece', '➕')] }] : [
    { title: 'Work', items: [
      item('/admin', 'Overview', '🏠'),
      ...(!builder ? [item('/admin/properties', staff ? 'Listings' : 'My listings', '🏘️')] : []),
      item('/admin/enquiries', builder ? 'Leads' : 'Enquiries', '📨'),
      ...(staff ? [item('/admin/properties?state=PENDING', 'Review queue', '🗂️'), item('/admin/reports?status=NEW', 'Reports', '🚩'), item('/admin/land', 'Land', '🌾'), item('/admin/invest', 'Investor corner', '📈')] : []),
    ] },
    { title: staff ? 'Partners' : 'Selling', items: [
      ...(me.role === 'AGENT' ? [item('/admin/verification', 'Get verified', '🛡️'), item('/admin/selling', 'Projects I sell', '🤝')] : []),
      ...(staff ? [item('/admin/dealers?status=SUBMITTED', 'Sellers', '🧑‍💼'), item('/admin/project-sellers', 'Agents on projects', '🤝'), item('/admin/site-videos', 'Site videos', '🎬')] : []),
      item('/admin/upcoming', 'Upcoming projects', '🚧'),
    ] },
    ...(staff ? [
      { title: 'Catalogue', items: [item('/admin/projects', 'Projects', '🏗️'), item('/admin/builder-pages', 'Builder pages', '🏢'), item('/admin/register', 'RERA registers', '📚'), item('/admin/localities', 'Localities', '📍'), item('/admin/cities', 'Cities', '🌆')] },
      { title: 'Site', items: [item('/admin/articles', 'Guides and blog', '✍️'), item('/admin/questions', 'Questions', '💬'), item('/admin/import', 'Import', '⬆️'), ...(me.role === 'ADMIN' ? [item('/admin/users', 'Users', '👥')] : [])] },
    ] : []),
  ];
  const role = staff ? 'Admin' : builder ? 'Builder leads' : writer ? 'Writer' : 'My listings';
  return (
    <div className="ashell">
      <aside className="aside">
        <Link href="/admin" className="aside-logo"><span className="orb" aria-hidden="true" />{BRAND}<small>{role}</small></Link>
        <Suspense fallback={null}><AdminNav groups={groups} /></Suspense>
      </aside>
      <div className="amain">
        <header className="atop">
          <Link href="/" className="atop-site" target="_blank">View site ↗</Link>
          <Link href="/admin/account" className="atop-me"><span aria-hidden="true">{me.name.charAt(0).toUpperCase()}</span><span><strong>{me.name}</strong><small>{me.email}</small></span></Link>
          <form action={logout}><button type="submit" className="abtn quiet">Sign out</button></form>
        </header>
        <main className="admin">
          {!me.emailVerified && (
            <div className="astatus">
              <p><strong>Confirm your email to start posting.</strong> We sent a link to {me.email}. Open it, then come back here.</p>
              <ActionButton action={resendVerification} label="Send the link again" />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

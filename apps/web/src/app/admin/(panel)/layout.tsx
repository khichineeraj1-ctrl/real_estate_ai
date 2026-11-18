import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe, isStaff, sessionToken } from '@/lib/admin';
import { BRAND } from '@/lib/seo';
import { ActionButton } from '@/components/admin/Form';
import { logout, resendVerification } from '../actions';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await sessionToken())) redirect('/admin/login');
  const me = await getMe(); // the API confirms the session and the role; the menu below only reflects it
  const staff = isStaff(me.role);
  const builder = me.role === 'BUILDER';
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link href="/admin" className="logo"><span className="orb" aria-hidden="true" />{BRAND} <small>{staff ? 'admin' : builder ? 'builder leads' : 'my listings'}</small></Link>
          <nav aria-label="Account"><Link href="/">View site</Link><Link href="/admin/account">{me.name}</Link></nav>
          <form action={logout}><button type="submit" className="alink">Sign out</button></form>
        </div>
      </header>
      <main className="wrap admin">
        <nav className="anav" aria-label="Sections">
          <Link href="/admin">Overview</Link>
          {!builder && <Link href="/admin/properties">{staff ? 'Listings' : 'My listings'}</Link>}
          <Link href="/admin/enquiries">{builder ? 'Leads' : 'Enquiries'}</Link>
          {me.role === 'AGENT' && <Link href="/admin/verification">Get verified</Link>}
          {staff && <Link href="/admin/dealers?status=SUBMITTED">Sellers</Link>}
          {staff && <Link href="/admin/reports?status=NEW">Reports</Link>}
          {staff && <Link href="/admin/properties?state=PENDING">Review queue</Link>}
          {staff && <Link href="/admin/import">Import</Link>}
          {staff && <Link href="/admin/projects">Projects</Link>}
          {staff && <Link href="/admin/register">RERA registers</Link>}
          {staff && <Link href="/admin/localities">Localities</Link>}
          {staff && <Link href="/admin/cities">Cities</Link>}
          {staff && <Link href="/admin/questions">Questions</Link>}
          {me.role === 'ADMIN' && <Link href="/admin/users">Users</Link>}
        </nav>
        {!me.emailVerified && (
          <div className="astatus">
            <p><strong>Confirm your email to start posting.</strong> We sent a link to {me.email}. Open it, then come back here.</p>
            <ActionButton action={resendVerification} label="Send the link again" />
          </div>
        )}
        {children}
      </main>
    </>
  );
}

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE } from '@/lib/admin';
import { logout } from '../actions';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // A quick check to avoid drawing the panel for signed-out visitors; the API verifies the session on every request.
  if (!(await cookies()).get(ADMIN_COOKIE)) redirect('/admin/login');
  return (
    <div className="admin">
      <nav className="anav" aria-label="Admin">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/properties">Listings</Link>
        <Link href="/admin/projects">Projects</Link>
        <Link href="/admin/localities">Localities</Link>
        <Link href="/admin/cities">Cities</Link>
        <Link href="/admin/questions">Questions</Link>
        <form action={logout}><button type="submit" className="alink">Sign out</button></form>
      </nav>
      {children}
    </div>
  );
}

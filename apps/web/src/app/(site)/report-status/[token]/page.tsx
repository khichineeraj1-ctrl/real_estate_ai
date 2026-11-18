import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { reasonLabel } from '@/lib/trust';

// A private page for one person: not indexed, and its address is not passed on when a link is followed.
export const metadata: Metadata = { title: 'Your report', robots: { index: false, follow: false }, referrer: 'no-referrer' };

interface Status { status: 'NEW' | 'UPHELD' | 'DISMISSED'; listingTitle: string; reason: string; createdAt: string; decidedAt: string | null; message: string }
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const HEADING = { NEW: 'We are looking into your report', UPHELD: 'Your report was upheld', DISMISSED: 'We could not confirm your report' };

export default async function ReportStatus({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await api<Status>(`/reports/status/${encodeURIComponent(token)}`, { revalidate: 0 });
  if (!r) notFound();
  return (
    <>
      <h1>{HEADING[r.status]}</h1>
      <p className="lead">Your report about “{r.listingTitle}”, sent on {day(r.createdAt)}: {reasonLabel(r.reason).toLowerCase()}.</p>
      <section className="trust">
        {r.message.split('\n\n').map((para) => <p key={para}>{para}</p>)}
        {r.decidedAt && <p className="calc-note">Decided on {day(r.decidedAt)}.</p>}
      </section>
      <p className="section">We never tell a seller who reported them. Keep this page’s address private: anyone who has it can see this outcome. <Link href="/">Back to the home page</Link></p>
    </>
  );
}

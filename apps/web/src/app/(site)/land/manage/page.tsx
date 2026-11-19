import type { Metadata } from 'next';
import Link from 'next/link';
import { CloseButton } from '@/components/land/forms';

export const metadata: Metadata = { title: 'Your listing', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
const API_URL = process.env.API_URL || 'http://localhost:4100';
interface Mine { type: 'listing' | 'wanted'; slug: string; title: string; status: string; note: string | null; replies: number }
const STATUS: Record<string, string> = { PENDING: 'Waiting for our team to check it. This usually takes a working day.', LIVE: 'Live: people can see it.', REJECTED: 'Not accepted.', CLOSED: 'Closed. It no longer shows as open.' };

export default async function Manage({ searchParams }: { searchParams: Promise<{ token?: string; new?: string }> }) {
  const sp = await searchParams;
  const token = sp.token ?? '';
  const res = token ? await fetch(`${API_URL}/land/manage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' }).catch(() => null) : null;
  const m = res?.ok ? ((await res.json()) as Mine) : null;
  if (!m) return <div className="land-post"><h1>This link is not valid</h1><p className="lead">Open the link exactly as it was shown to you after posting. If you have lost it, post again or write to us.</p><p><Link href="/land">Back to land</Link></p></div>;
  const what = m.type === 'listing' ? 'listing' : 'requirement';
  const page = m.type === 'listing' ? `/land/listing/${m.slug}` : `/land/wanted/${m.slug}`;
  return (
    <div className="land-post">
      {sp.new && (
        <div className="land-saved" role="status">
          <strong>✓ Received. Keep this page’s address.</strong>
          <p>It is your private link to this {what}: bookmark it or send it to yourself now. You will need it to take the {what} down later. Do not share it.</p>
        </div>
      )}
      <h1>Your {what}</h1>
      <p className="lead">{m.title.charAt(0).toUpperCase() + m.title.slice(1)}</p>
      <dl className="land-facts">
        <div><dt>Status</dt><dd>{STATUS[m.status] ?? m.status}{m.note ? ` Reason: ${m.note}` : ''}</dd></div>
        <div><dt>{m.type === 'listing' ? 'Enquiries so far' : 'Answers so far'}</dt><dd>{m.replies}{m.replies ? '. Our team calls you about each one.' : ''}</dd></div>
        {m.status === 'LIVE' && <div><dt>Public page</dt><dd><Link href={page}>See it as others do</Link></dd></div>}
      </dl>
      {(m.status === 'LIVE' || m.status === 'PENDING') && <section className="section"><h2>{m.type === 'listing' ? 'Sold or let it?' : 'Found what you needed?'}</h2><CloseButton token={token} what={what} /></section>}
    </div>
  );
}

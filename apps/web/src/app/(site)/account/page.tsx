import type { Metadata } from 'next';
import Link from 'next/link';
import { SavedList } from '@/components/account/SavedList';
import { SignIn } from '@/components/account/SignIn';
import { getBuyer } from '@/lib/buyer';
import { monthYear } from '@/lib/format';
import { builderPath } from '@/lib/seo';
import { deleteAccount, signOut } from './actions';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ next?: string; expired?: string; deleted?: string }> };

const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const standing = (status?: string | null, until?: string | null) => (/lapsed/i.test(status ?? '') ? 'RERA registration marked lapsed' : until ? `RERA registration ${new Date(until) < new Date() ? 'ran' : 'runs'} to ${monthYear(until)}` : null);

export default async function Account({ searchParams }: Props) {
  const sp = await searchParams;
  const me = await getBuyer();
  if (!me) {
    return (
      <div className="account-in">
        <div>
          <h1>Your account</h1>
          <p className="lead">Keep everything about your home search in one place, on any device.</p>
          <ul className="account-why">
            <li><span aria-hidden="true">♥</span><div><strong>Save projects and homes</strong>with your own notes on each.</div></li>
            <li><span aria-hidden="true">📨</span><div><strong>See every enquiry you sent</strong>and who was to call you.</div></li>
            <li><span aria-hidden="true">✓</span><div><strong>Keep your shortlists and checklists</strong>when you change phone or browser.</div></li>
          </ul>
        </div>
        <div className="account-card">
          <h2>Sign in or start an account</h2>
          {sp.expired && <p role="alert" className="aerror">That sign-in link has expired or was already used. Ask for a new code.</p>}
          {sp.deleted && <p role="status" className="anotice">Your account and everything saved in it have been deleted.</p>}
          <SignIn next={sp.next} />
        </div>
      </div>
    );
  }

  const saved = me.saved.map((s) => ({
    kind: s.kind, slug: s.slug, name: s.name, sub: s.sub, photo: s.photo, priceInr: s.priceInr, note: s.note,
    // The short addresses redirect to each page's full one.
    href: s.kind === 'project' ? (s.brand && s.city ? `${builderPath(s.city, s.brand)}/${s.slug}` : `/projects/${s.slug}`) : `/property/${s.slug}`,
    standing: s.kind === 'project' ? standing(s.registerStatus, s.registerValidUntil) : null,
  }));
  return (
    <>
      <div className="account-head">
        <div><h1>My account</h1><p className="lead">Signed in as {me.email}</p></div>
        <form action={signOut}><button type="submit" className="abtn quiet">Sign out</button></form>
      </div>

      <section className="section">
        <h2>Saved <span className="count">{saved.length}</span></h2>
        {saved.length ? <SavedList items={saved} /> : <p className="empty">Nothing saved yet. Press “♡ Save” on any project or home and it will appear here. <Link href="/builders">Browse builders</Link> or <Link href="/">ask a question</Link>.</p>}
      </section>

      <section className="section">
        <h2>Enquiries you sent <span className="count">{me.enquiries.length}</span></h2>
        {me.enquiries.length ? (
          <ul className="sent">
            {me.enquiries.map((e, i) => (
              <li key={i}>
                <span className="sent-date">{when(e.at)}</span>
                <div>
                  <strong>{e.about ? <Link href={e.about.kind === 'project' ? `/projects/${e.about.slug}` : `/property/${e.about.slug}`}>{e.about.name}</Link> : 'A page that is no longer listed'}</strong>
                  <p>{e.agent ? <>Passed to {e.agent.name}, an agent we have verified{e.agent.phone ? <>: <a href={`tel:${e.agent.phone}`}>{e.agent.phone}</a></> : ''}.</> : e.about?.kind === 'property' ? 'Sent to the seller.' : 'Our team, or the builder’s, was to call you.'}{e.wantsVisit ? ' You asked for a site visit.' : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="empty">You have not sent an enquiry while signed in. When you do, it is kept here so you know who to expect a call from.</p>}
      </section>

      <section className="section account-foot">
        <p className="calc-note">Your compare shortlists and “before you pay” ticks are kept on this account and follow you to any browser where you sign in.</p>
        <form action={deleteAccount}><button type="submit" className="alink danger">Delete my account and everything saved in it</button></form>
      </section>
    </>
  );
}

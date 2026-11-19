import type { Metadata } from 'next';
import Link from 'next/link';
import { unfollow } from '../actions';

export const metadata: Metadata = { title: 'Stop project alerts', robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ token?: string }> };

export default async function Unfollow({ searchParams }: Props) {
  const { token } = await searchParams;
  const ok = token ? await unfollow(token) : false;
  return (
    <>
      <h1>{ok ? 'You will get no more emails about that project' : 'That link did not work'}</h1>
      <p className="lead">{ok ? 'We have stopped the alerts. You can follow a project again from its page at any time.' : 'The link may be incomplete. Open the link from the email again, or write to us and we will stop the alerts for you.'}</p>
      <p><Link className="abtn quiet" href="/">Back to the home page</Link></p>
    </>
  );
}

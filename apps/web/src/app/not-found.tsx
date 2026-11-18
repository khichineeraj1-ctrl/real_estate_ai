import Link from 'next/link';
import { AskBox } from '@/components/AskBox';

export default function NotFound() {
  return (
    <>
      <h1>We could not find that page</h1>
      <p className="lead">The listing may have been sold or the address mistyped. Ask for what you are looking for, or <Link href="/">start from the home page</Link>.</p>
      <AskBox />
    </>
  );
}

import Link from 'next/link';
import { AskBox } from '@/components/AskBox';
import { Footer, Header } from '@/components/Chrome';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="wrap">
        <h1>We could not find that page</h1>
        <p className="lead">The listing may have been sold or the address mistyped. Ask for what you are looking for, or <Link href="/">start from the home page</Link>.</p>
        <AskBox />
      </main>
      <Footer />
    </>
  );
}

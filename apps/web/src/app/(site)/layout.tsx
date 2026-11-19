import { Footer, Header } from '@/components/Chrome';
import { AccountSync } from '@/components/account/AccountSync';
import { IntentBeacon } from '@/components/IntentBeacon';
import { CompareBar } from '@/components/tools/Compare';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="wrap">{children}</main>
      <Footer />
      <CompareBar />
      <IntentBeacon />
      <AccountSync />
    </>
  );
}

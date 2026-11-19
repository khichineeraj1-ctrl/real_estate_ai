import { Footer, Header } from '@/components/Chrome';
import { AccountSync } from '@/components/account/AccountSync';
import { IntentBeacon } from '@/components/IntentBeacon';
import { TabBar } from '@/components/MobileNav';
import { CompareBar } from '@/components/tools/Compare';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="wrap">{children}</main>
      <Footer />
      <CompareBar />
      <TabBar />
      <IntentBeacon />
      <AccountSync />
    </>
  );
}

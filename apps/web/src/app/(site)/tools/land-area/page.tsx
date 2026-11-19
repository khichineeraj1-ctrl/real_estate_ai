import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Faq } from '@/components/Faq';
import { AreaConverter } from '@/components/land/AreaConverter';
import { OtherTools } from '@/components/tools/OtherTools';
import { pageMeta } from '@/lib/seo';

const title = 'Land Area Converter — Acre, Hectare, Gaj, Guntha, Kanal, Cent';
const description = 'Convert land sizes between acres, hectares, square feet, square yards (gaj), guntha, cent, kanal and ground. And why bigha, katha and marla cannot be converted without asking locally.';
export const metadata: Metadata = pageMeta({ title, description, path: '/tools/land-area' });

export default function LandAreaPage() {
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Tools', path: '/tools' }, { name: 'Land area converter', path: '/tools/land-area' }]} />
      <h1>Land area converter</h1>
      <p className="lead">Type a size and see it in every unit that means the same thing everywhere in India. Tap a result to convert from that unit.</p>
      <AreaConverter />
      <p className="section"><Link className="abtn" href="/land">Browse land and warehouses</Link> <Link className="abtn quiet" href="/land/post">List your land free</Link></p>
      <Faq title="Land measurement: common questions" faqs={[
        { q: 'How many square feet are in an acre?', a: '43,560 square feet, which is 4,840 square yards (gaj) or about 0.405 hectare.' },
        { q: 'How big is a guntha?', a: '1,089 square feet (121 square yards). Forty guntha make one acre.' },
        { q: 'How big is a kanal?', a: '5,445 square feet. Eight kanal make one acre.' },
        { q: 'How big is a cent?', a: '435.6 square feet. One hundred cents make one acre.' },
        { q: 'Why can a bigha not be converted?', a: 'Because there is no single bigha. Its size is set by local custom and differs between states and even between districts. The same is true of katha, biswa and marla. Always ask the seller what one unit is locally, in square feet or acres, and check it against the land record.' },
      ]} />
      <OtherTools current="/tools/land-area" />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

export interface GuideCard { slug: string; title: string; short: string; summary: string; icon: string; minutes: number }
export const revalidate = 3600;
export const metadata: Metadata = pageMeta({ title: 'Home Buying Guides — RERA, Carpet Area, Costs & Your Rights', description: 'Short, plain guides for home buyers in India: carpet area, RERA registration, the 10% rule, reading a cost sheet, delays and the occupation certificate.', path: '/guides' });

export default async function Guides() {
  const guides = (await api<GuideCard[]>('/guides', { revalidate: 3600 })) ?? [];
  return (
    <>
      <Breadcrumbs crumbs={[{ name: 'Guides', path: '/guides' }]} />
      <h1>Home buying guides</h1>
      <p className="lead">Short, plain answers to the questions that cost buyers money. Each takes a few minutes.</p>
      <ul className="guides">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`}>
              <span className="guide-icon" aria-hidden="true">{g.icon}</span>
              <strong>{g.short}</strong>
              <span>{g.summary}</span>
              <b aria-hidden="true">{g.minutes} min read <i>→</i></b>
            </Link>
          </li>
        ))}
      </ul>
      <p className="calc-note">General information about buying a home in India, not legal advice. Laws and rates change and differ by state; have your own lawyer read your papers.</p>
    </>
  );
}

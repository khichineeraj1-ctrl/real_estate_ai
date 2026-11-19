import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PostWantedForm, type LandOptions } from '@/components/land/forms';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'Say what you are looking for', description: 'For companies and buyers: describe the land or space you need and where. Owners with something that fits answer, and our team sends you their details.', path: '/land/wanted/post' });

export default async function Page() {
  const o = await api<LandOptions>('/land/options', { revalidate: 3600 });
  return (
    <div className="land-post">
      <Breadcrumbs crumbs={[{ name: 'Land', path: '/land' }, { name: 'Wanted', path: '/land/wanted' }, { name: 'Post a requirement', path: '/land/wanted/post' }]} />
      <h1>Say what you are looking for</h1>
      <p className="lead">For companies and buyers: describe the land or space you need and where. Owners with something that fits answer, and our team sends you their details.</p>
      {o ? <PostWantedForm o={o} /> : <p className="empty">The form could not be loaded. Please try again shortly.</p>}
    </div>
  );
}

import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PostLandForm, type LandOptions } from '@/components/land/forms';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'List your land or space, free', description: 'Farm land, a plot, industrial land, or a warehouse or shop to rent out. One form, no account. Our team checks it and it goes live; buyers’ enquiries come to you through us.', path: '/land/post' });

export default async function Page() {
  const o = await api<LandOptions>('/land/options', { revalidate: 3600 });
  return (
    <div className="land-post">
      <Breadcrumbs crumbs={[{ name: 'Land', path: '/land' }, { name: 'List yours', path: '/land/post' }]} />
      <h1>List your land or space, free</h1>
      <p className="lead">Farm land, a plot, industrial land, or a warehouse or shop to rent out. One form, no account. Our team checks it and it goes live; buyers’ enquiries come to you through us.</p>
      {o ? <PostLandForm o={o} /> : <p className="empty">The form could not be loaded. Please try again shortly.</p>}
    </div>
  );
}

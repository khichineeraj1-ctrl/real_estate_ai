import { notFound, permanentRedirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { ProjectDetail } from '@/lib/types';

// Projects used to live at /projects/<project>. They are now under their builder, and the old address sends people there.
export default async function OldProjectAddress({ params }: { params: Promise<{ slug: string }> }) {
  const p = await api<ProjectDetail>(`/projects/${(await params).slug}`);
  if (!p?.brand) notFound();
  permanentRedirect(`/builders/${p.brand.slug}/${p.slug}`);
}

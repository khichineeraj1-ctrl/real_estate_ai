import { notFound, permanentRedirect } from 'next/navigation';
import { loadProject } from '@/components/pages/ProjectView';
import { projectPath } from '@/lib/seo';

// Projects used to live at /projects/<project>. They are now at /<city>/<builder>/<project>, and the old address sends people there.
export default async function OldProjectAddress({ params }: { params: Promise<{ slug: string }> }) {
  const p = await loadProject((await params).slug);
  if (!p?.brand) notFound();
  permanentRedirect(projectPath(p.city.slug, p));
}

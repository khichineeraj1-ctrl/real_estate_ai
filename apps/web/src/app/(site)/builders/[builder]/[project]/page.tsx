import { notFound, permanentRedirect } from 'next/navigation';
import { loadProject } from '@/components/pages/ProjectView';
import { projectPath } from '@/lib/seo';

// Projects were briefly at /builders/<builder>/<project>. They are now at /<city>/<builder>/<project>.
export default async function OldProjectAddress({ params }: { params: Promise<{ project: string }> }) {
  const p = await loadProject((await params).project);
  if (!p?.brand) notFound();
  permanentRedirect(projectPath(p.city.slug, p));
}

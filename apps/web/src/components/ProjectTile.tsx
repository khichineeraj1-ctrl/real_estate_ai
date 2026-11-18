import Link from 'next/link';
import { media, projectPath } from '@/lib/seo';
import { ConnectButton } from './ConnectButton';

interface Project { slug: string; name: string; brand?: { slug: string; name: string } | null; registerSource?: string | null; agents?: number; photos?: { file: string }[] }

/** A project in a list: its name and a line or two about it, linking to its page, with a button to ask about it there and then. */
export function ProjectTile({ city, p, lines }: { city: string; p: Project; lines: (string | null | undefined | false)[] }) {
  const agents = p.agents ?? 0;
  const cover = p.photos?.[0];
  return (
    <li className="ptile">
      <Link href={projectPath(city, p)}>
        {cover && <img className="ptile-photo" src={media(cover.file, 'card')} alt={`${p.name}: photo`} width={640} height={480} loading="lazy" decoding="async" />}
        <strong>{p.name}</strong>
        {lines.filter(Boolean).map((l) => <span key={l as string}>{l}</span>)}
        {agents > 0 && <span className="ptile-agents">✓ {agents === 1 ? 'A verified agent sells this' : `${agents} verified agents sell this`}</span>}
      </Link>
      <ConnectButton kind="project" slug={p.slug} name={p.name} mode={agents > 0 ? 'agent' : 'callback'} agents={agents} unclaimed={!!p.registerSource} />
    </li>
  );
}

'use client';

import { useEffect, useState } from 'react';

/**
 * Beside a guide: a bar across the top that fills as you read, and the list of sections with the one on screen
 * marked. Without scripts the list is still plain jump links.
 */
export function GuideNav({ sections }: { sections: { id: string; heading: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const [read, setRead] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const body = document.querySelector<HTMLElement>('.guide-body');
      if (!body) return;
      const top = body.getBoundingClientRect().top + window.scrollY; const span = Math.max(body.offsetHeight - window.innerHeight * 0.6, 1);
      setRead(Math.min(Math.max((window.scrollY - top + 120) / span, 0), 1));
      let now = sections[0]?.id ?? '';
      for (const s of sections) { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top < 160) now = s.id; }
      setActive(now);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);
  return (
    <>
      <div className="guide-progress" aria-hidden="true"><i style={{ transform: `scaleX(${read})` }} /></div>
      <nav className="guide-rail" aria-label="On this page">
        <p>On this page</p>
        <ol>{sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}><span>{i + 1}</span>{s.heading}</a></li>)}</ol>
        <p className="guide-read" aria-live="off">{Math.round(read * 100)}% read</p>
      </nav>
    </>
  );
}

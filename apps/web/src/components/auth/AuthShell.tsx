import Link from 'next/link';
import { BRAND } from '@/lib/seo';

interface Point { icon: string; title: string; text: string }

/**
 * The two-panel frame shared by sign-up, sign-in and the password screens: a brand panel with a few points on one
 * side, the form on the other. On a phone the brand panel shrinks to a strip above the form.
 */
export function AuthShell({ title, lead, points, kicker, children, standalone = true }: { title: string; lead: string; points: Point[]; kicker: string; children: React.ReactNode; standalone?: boolean }) {
  return (
    <div className={`auth ${standalone ? 'auth-page' : ''}`}>
      <aside className="auth-art">
        <span className="blob blob-a" aria-hidden="true" /><span className="blob blob-b" aria-hidden="true" /><span className="blob blob-c" aria-hidden="true" />
        {standalone && <Link href="/" className="auth-logo"><span className="orb" aria-hidden="true" />{BRAND}</Link>}
        <p className="auth-kicker">{kicker}</p>
        <ul className="auth-points">
          {points.map((p, i) => (
            <li key={p.title} style={{ animationDelay: `${120 + i * 110}ms` }}>
              <span className="auth-point-icon" aria-hidden="true">{p.icon}</span>
              <span><strong>{p.title}</strong>{p.text}</span>
            </li>
          ))}
        </ul>
      </aside>
      <section className="auth-main">
        <h1>{title}</h1>
        <p className="auth-lead">{lead}</p>
        {children}
      </section>
    </div>
  );
}

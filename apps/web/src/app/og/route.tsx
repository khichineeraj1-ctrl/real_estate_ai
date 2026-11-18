import { ImageResponse } from 'next/og';
import { BRAND, TAGLINE } from '@/lib/seo';

/**
 * The picture shown when a page is shared (WhatsApp, X, LinkedIn, Slack): the page's own title on the brand colours.
 * /og?t=<title>&s=<line under it>. Text is cut to a sensible length, so the address cannot be used to draw an essay.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const title = (q.get('t') || BRAND).slice(0, 110);
  const sub = (q.get('s') || TAGLINE).slice(0, 120);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5a4 100%)', color: '#ffffff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: '#ffffff', marginRight: 14 }} />
          {BRAND}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: title.length > 60 ? 56 : 70, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>{title}</div>
          <div style={{ fontSize: 30, marginTop: 22, opacity: 0.92 }}>{sub}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } },
  );
}

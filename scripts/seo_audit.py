"""Fetches one page of each kind and reports the on-page SEO basics. Usage: python3 seo_audit.py [base]"""
import html, re, sys, urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3210'
PAGES = ['/', '/gurgaon', '/gurgaon/dlf-phase-3', '/gurgaon/dlf', '/gurgaon/ss-group/ss-100-sohna-road-gurgaon', '/builders', '/builders/godrej-properties',
         '/tools', '/tools/emi-calculator', '/tools/home-affordability', '/tools/cost-of-buying', '/compare', '/gurgaon/compare/dlf-phase-3-vs-sector-57', '/ask', '/post-property']

def text(s): return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s))).strip()

for path in PAGES:
    try:
        r = urllib.request.urlopen(BASE + path); h = r.read().decode(); size = len(h)
    except Exception as e:
        print(f'\n== {path}: {e}'); continue
    head = h[:h.find('</head>')] if '</head>' in h else h
    body = re.sub(r'<script.*?</script>|<style.*?</style>', '', h[h.find('<body'):], flags=re.S)
    main = re.search(r'<main[^>]*>(.*?)</main>', body, re.S); main = main.group(1) if main else body
    title = text((re.search(r'<title>(.*?)</title>', h, re.S) or [None, ''])[1])
    meta = lambda n: html.unescape((re.search(rf'<meta (?:name|property)="{n}" content="([^"]*)"', h) or [None, ''])[1])
    desc = meta('description'); canon = (re.search(r'<link rel="canonical" href="([^"]*)"', h) or [None, ''])[1]
    hs = [(int(l), text(t)) for l, t in re.findall(r'<h([1-6])[^>]*>(.*?)</h\1>', body, re.S)]
    h1 = [t for l, t in hs if l == 1]
    skips = [f'h{a}→h{b} "{t[:30]}"' for (a, _), (b, t) in zip(hs, hs[1:]) if b > a + 1]
    imgs = re.findall(r'<img[^>]*>', body); noalt = [i[:90] for i in imgs if not re.search(r'\balt="[^"]+"', i) and 'aria-hidden' not in i and 'alt=""' not in i]
    links = set(re.findall(r'<a[^>]+href="(/[^"#?]*)', main)); allinks = re.findall(r'<a[^>]+href="(/[^"#?]*)"[^>]*>(.*?)</a>', body, re.S)
    vague = [text(t) for _, t in allinks if text(t).lower() in ('click here', 'here', 'read more', 'more', 'open →', 'view page', 'link')]
    ld = re.findall(r'"@type":"([A-Za-z]+)"', h)
    flags = []
    if not (30 <= len(title) <= 65): flags.append(f'title {len(title)} chars')
    if not (70 <= len(desc) <= 160): flags.append(f'description {len(desc)} chars')
    if not canon: flags.append('no canonical')
    if len(h1) != 1: flags.append(f'{len(h1)} h1')
    if skips: flags.append('heading skips: ' + '; '.join(skips[:3]))
    if noalt: flags.append(f'{len(noalt)} img without alt')
    if not meta('og:title'): flags.append('no og:title')
    if not meta('og:image'): flags.append('no og:image')
    if not meta('twitter:card'): flags.append('no twitter:card')
    if vague: flags.append(f'vague link text: {sorted(set(vague))}')
    print(f'\n== {path}  ({size // 1024} KB html)')
    print(f'   title[{len(title)}]: {title}')
    print(f'   desc[{len(desc)}]: {desc[:170]}')
    print(f'   h1: {h1} | headings: {len(hs)} | links in main: {len(links)} | imgs: {len(imgs)} | robots: {meta("robots") or "-"} | schema: {sorted(set(ld))[:8]}')
    print('   FLAGS: ' + (' | '.join(flags) if flags else 'none'))

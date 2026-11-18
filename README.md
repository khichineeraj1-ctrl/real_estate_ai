# HomeAsk (working name)

A website and mobile app for home buyers in India where the front door is a question, not a search form: type or speak
("3 BHK in Whitefield under 1.5 crore") and get a direct answer with matching homes. Underneath the conversation sits a
conventional, fully server-rendered set of city, locality, project and property pages built to rank in search.

The brand name is a placeholder. To rename, change `brand.json` (web and structured data), `BRAND_NAME` in
`apps/api/.env` (the assistant's name) and `name`/`slug`/`scheme` in `apps/mobile/app.json`.

**All listings are generated sample data** (`apps/api/prisma/seed.ts`): project names, builders, RERA numbers and prices
are made up. There are no photos yet.

## Layout

| Path | What | Port |
|---|---|---|
| `apps/api` | NestJS + Prisma API over Postgres: catalogue, search, `/ask` | 4100 |
| `apps/web` | Next.js (App Router) site: SEO pages and the ask box | 3210 |
| `apps/mobile` | Expo / React Native app: ask, browse, property detail | Metro default |

`apps/api` and `apps/web` are npm workspaces. `apps/mobile` is a standalone project because React Native pins its own React version.

## Run it locally

Needs Node 24 and npm 11. No Docker: the database is an embedded Postgres stored in `apps/api/.pgdata`.

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:dev        # terminal 1: Postgres on port 5441 (leave running)
npm run db:push       # once: create tables
npm run db:seed       # once: 4 cities, 24 localities, 48 projects, 228 homes
npm run dev:api       # terminal 2: http://localhost:4100
npm run dev:web       # terminal 3: http://localhost:3210
```

Mobile:

```bash
npm run install:mobile
npm run dev:mobile    # scan the QR code with Expo Go, or press i / a / w
```

On a phone the app looks for the API on the machine running Metro (port 4100), so both must be on the same wifi.
Set `EXPO_PUBLIC_API_URL` to point elsewhere.

`npm test` runs the question-parser tests. `npm run build` builds the API and the site (the API must be running
during the site build, because the home page is prerendered from it).

## The ask experience

- **Web**: the ask box is on the home page and on every city, locality, project and property page (where it knows which
  place you are looking at). The microphone uses the browser's speech recognition (Chrome, Edge, Safari); answers to
  spoken questions are read aloud, and a "Read answers aloud" switch controls it. Without JavaScript the box is a
  plain form that goes to `/ask?q=…`, which answers on the server.
- **API** `POST /ask` `{ message, history?, context? }` returns `{ reply, live, properties, total, page }`.
  - With `ANTHROPIC_API_KEY` set in `apps/api/.env`, Claude answers and searches the database through a
    `search_properties` tool (`live: true`). The model is `claude-opus-5-5` at low effort by default; set
    `ASSISTANT_MODEL=claude-haiku-5-5` for a cheaper, faster assistant. Requests are rate limited per visitor and per day.
  - Without a key, or if the model call fails, a built-in parser (`apps/api/src/ask/parse.ts`) pulls city, locality,
    size, type, budget and status out of the question and writes the answer itself (`live: false`).
  - `page` is the indexable page that shows everything the answer is about, so answers always lead into real pages.
- **Mobile**: the ask screen is the home screen; answers are read aloud with `expo-speech`. The in-app microphone
  works in the web build. Expo Go has no speech recognition module, so on phones the app points to the keyboard's
  dictation key; `apps/mobile/lib/voice.ts` is the one place to plug in a native recogniser in a development build.

## Admin panel

`/admin` on the site, for one shared admin login. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `apps/api/.env`
(`.env.example` has local development values; change both, and set a long random `ADMIN_SECRET`, anywhere public).

- **Listings, projects, localities, cities**: add, edit and delete. Saving refreshes the public pages straight away.
  Page addresses never change after creation, so renaming a listing or city does not break links. A locality or city
  that still has content cannot be deleted; deleting a project keeps its listings and unlinks them.
- **Questions**: what buyers asked, whether Claude or the parser answered, and which had no exact match (nothing found,
  or found only after dropping the budget, locality or status). Only the words and outcome are stored, not who asked.
  A question about a city that is not covered is logged as answered when the assistant offers a covered city instead.
- The API checks a signed 12-hour session on every admin request (`apps/api/src/admin/auth.ts`); the site only carries
  it in an http-only cookie. Without `ADMIN_SECRET`, sessions end whenever the API restarts. Sign-in is limited to
  five attempts a minute per address; because the site signs in on the admin's behalf, that limit is shared by
  everyone signing in through the site.
- `/admin` is `noindex` and disallowed in `robots.txt`.

## SEO

| URL | Page | Structured data |
|---|---|---|
| `/` | Ask box, cities, localities, newest homes | `WebSite` + `SearchAction`, `Organization` |
| `/[city]` | City overview, localities, projects | `BreadcrumbList`, `ItemList`, `FAQPage` |
| `/[city]/[locality]` | Locality facts and all its homes | `BreadcrumbList`, `ItemList`, `FAQPage`, `Place` |
| `/[city]/[locality]/[n]-bhk-flats` | One size in one locality | `BreadcrumbList`, `ItemList`, `FAQPage` |
| `/projects/[slug]` | Builder project and its homes | `BreadcrumbList`, `ApartmentComplex`, `ItemList` |
| `/property/[slug]` | One home | `BreadcrumbList`, `RealEstateListing` with `Offer` |
| `/ask?q=…` | Server-rendered answer | none; `noindex, follow` |

- Every page is rendered on the server with its content, title, description and canonical URL in the HTML.
- Size pages with no homes, unknown places and removed listings return a real 404.
- The footer links every city and locality from every page; listing pages link to sizes, projects and nearby localities.
- `/sitemap.xml` lists every indexable URL. `/robots.txt` disallows everything unless `ALLOW_INDEXING=true`, so only
  production is crawled. Set `SITE_URL` to the public address there.

## Not done yet

Photos, enquiry/contact forms, buyer accounts and saved searches, separate admin users with roles, bulk import, pagination beyond 48 homes per listing page, a real
listings feed, native speech-to-text on phones, a Content-Security-Policy header, and deployment.

# HomeAsk (working name)

A website and mobile app for home buyers in India where the front door is a question, not a search form: type or speak
("3 BHK in Whitefield under 1.5 crore") and get a direct answer with matching homes. Underneath the conversation sits a
conventional, fully server-rendered set of city, locality, project and property pages built to rank in search.

The brand name is a placeholder. To rename, change `brand.json` (web and structured data), `BRAND_NAME` in
`apps/api/.env` (the assistant's name) and `name`/`slug`/`scheme` in `apps/mobile/app.json`.

**All listings are generated sample data** (`apps/api/prisma/seed.ts`): project names, builders, RERA numbers and prices
are made up. Seed listings have no photos; photos are added in the admin panel.

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

## Admin panel, accounts and self-service posting

`/admin` on the site. Four kinds of account:

| Role | Can do |
|---|---|
| **Admin** | Everything, including managing users |
| **Editor** | All content (listings, projects, localities, cities), approvals, import and the questions log; not users |
| **Owner / agent** | Signs up at `/post-property`; adds, edits and deletes only their own listings |
| **Builder** | Created by an admin and linked to projects; sees only the leads on those projects |

- **Owner account**: `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `apps/api/.env` create (and on every start reset) one admin, so
  there is always a way in. `.env.example` has local development values; change both, and set a long random
  `ADMIN_SECRET`, anywhere public. Admins add editors and other admins under **Users**. Accounts are deactivated, not
  deleted; deactivation and role changes take effect on the next request.
- **Self-service posting**: `/post-property` is a public, indexable page where owners, agents and builders create an
  account. Their listings start as *waiting for review* and are not on the site, in answers or in the sitemap until staff
  approve them in the **Review queue**. Staff can reject with a reason the owner sees. When an owner edits a live listing
  or adds a photo it goes back to review.
- **Email confirmation and password reset**: a new seller gets a one-time link (valid 48 hours) and cannot post until
  they open it. "Forgot your password?" on the sign-in page sends a one-time link valid for 1 hour. Changing or resetting
  a password signs out every other session of that account. Accounts created by an admin are trusted without the link.
- **Enquiries**: every property page (and the app's property screen) has a "Contact the seller" form. The buyer gives a
  name and phone, agrees to share them, and is then shown the seller's name and phone; the seller is emailed and sees
  the enquiry under **Enquiries**. Listings without a seller account (seed, imported, staff-added) tell the buyer our
  team will call, and staff see those enquiries. Limited to four a minute per visitor, with a hidden field to catch bots.
- **Leads on builder projects**: every project page has a "Request a call back" form (name, phone, the size they want).
  No phone number is shown to the buyer; the lead is kept for staff under **Enquiries → Builder projects**. A project
  can have a **sales email** (set on its admin page, never shown publicly): each lead on the project, and on the
  builder's own listings in it, is emailed there as it arrives. Staff can download a project's leads, or all
  enquiries, as a spreadsheet (CSV).
- **Builder logins**: an admin adds a user with the role *Builder* under **Users**, then picks that login on each of
  the builder's projects (**Projects → project → Builder login**). The builder signs in at `/admin/login` and sees an
  overview of their projects and a **Leads** screen with a spreadsheet download, and nothing else: no listings,
  content, questions or other builders' leads. They see project leads and enquiries on their own stock in the project,
  but not enquiries on resale listings that an owner or agent posted there (those buyers agreed to share their details
  with that seller only). If a project has no sales email, its leads are emailed to the builder login instead.
- **Lead status**: every enquiry starts as *New* and can be moved to *Contacted*, *Site visit planned*, *Booked* or
  *Not interested*, with a short private note, by anyone who can see it (staff, the listing's seller, or the project's
  builder). It is edited in place on the **Enquiries** / **Leads** screen, which has a tab with a count for each
  status; overviews show how many are still new, and the spreadsheet includes status and note. There is one shared
  status per lead, and no history of who changed it.
- **Photos**: up to 12 per listing, JPEG/PNG/WebP up to 5 MB each; the first is the cover. Each upload is re-encoded
  into two WebP files, a full size (longest side 1600px) and a 640×480 card size used in listings, which also turns
  the photo upright and removes embedded data such as GPS position. Files get random names in `apps/api/uploads`
  (override with `UPLOAD_DIR`), served by the API at `/uploads/…` and shown by the site at `/media/…`. Local disk only
  suits a single server: `apps/api/src/admin/photos.ts` is the one place to switch to object storage.
- **Bulk import**: staff upload a CSV of up to 500 listings under **Import** (a sample file is linked there). Every row is
  checked first; if any row is wrong nothing is imported and the rows to fix are listed. Imported listings go live.
- **Listings, projects, localities, cities**: add, edit and delete. Saving refreshes the public pages straight away.
  Page addresses never change after creation, so renaming a listing or city does not break links. A locality or city
  that still has content cannot be deleted; deleting a project keeps its listings and unlinks them.
- **Questions**: what buyers asked, whether Claude or the parser answered, and which had no exact match (nothing found,
  or found only after dropping the budget, locality or status). Only the words and outcome are stored, not who asked.
  A question about a city that is not covered is logged as answered when the assistant offers a covered city instead.
- **Security**: passwords are stored as salted scrypt hashes. The API checks a signed 12-hour session and the account's
  role on every admin request (`apps/api/src/admin/auth.ts`); the site only carries the session in an http-only cookie
  and hides menus. Without `ADMIN_SECRET`, sessions end whenever the API restarts. Sign-in is limited to five attempts
  a minute per account, with looser per-address ceilings on sign-in and sign-up as flood protection (the site calls
  the API on visitors' behalf, so a strict per-address limit would lock ordinary users out). `/admin` is `noindex` and disallowed in `robots.txt`.

## Email

Confirmation links, password resets and new-enquiry notices are plain-text emails sent through any SMTP service: set
`SMTP_URL` and `MAIL_FROM` in `apps/api/.env`, and `SITE_URL` to the site's public address (it goes into the links).
Without `SMTP_URL`, as in local development, **nothing is sent**: each email is written to the API's log instead, so
you can copy the link from the terminal running `npm run dev:api`. Sending through a real SMTP service has not been tested.

## SEO

| URL | Page | Structured data |
|---|---|---|
| `/` | Ask box, cities, localities, newest homes | `WebSite` + `SearchAction`, `Organization` |
| `/[city]` | City overview, localities, projects | `BreadcrumbList`, `ItemList`, `FAQPage` |
| `/[city]/[locality]` | Locality facts and all its homes | `BreadcrumbList`, `ItemList`, `FAQPage`, `Place` |
| `/[city]/[locality]/[n]-bhk-flats` | One size in one locality | `BreadcrumbList`, `ItemList`, `FAQPage` |
| `/projects/[slug]` | Builder project, its homes and a lead form | `BreadcrumbList`, `ApartmentComplex`, `ItemList` |
| `/property/[slug]` | One home, with its photos | `BreadcrumbList`, `RealEstateListing` with `Offer` and `image` |
| `/post-property` | Sign-up for owners, agents and builders | `FAQPage` |
| `/ask?q=…` | Server-rendered answer | none; `noindex, follow` |

- Every page is rendered on the server with its content, title, description and canonical URL in the HTML.
- Size pages with no homes, unknown places and removed listings return a real 404.
- The footer links every city and locality from every page; listing pages link to sizes, projects and nearby localities.
- `/sitemap.xml` lists every indexable URL. `/robots.txt` disallows everything unless `ALLOW_INDEXING=true`, so only
  production is crawled. Set `SITE_URL` to the public address there.

## Not done yet

Buyer accounts and saved searches, a history of who changed a lead's status, reminders for leads left new, builders editing their own project pages,
a project screen and lead form in the mobile app, reordering photos, object storage for
photos, pagination beyond 48 homes per listing page, a real listings feed, native speech-to-text on phones, a
Content-Security-Policy header, and deployment.

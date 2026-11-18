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

## Confidence: how far a home and its seller are verified

A home is the largest purchase most buyers make, so every listing and seller carries a confidence level with the
reasons behind it. **Only things a member of staff actually confirmed can raise it**: what a seller says about
themselves counts for nothing until someone has checked it. The rules are in `apps/api/src/trust/confidence.ts` (pure
functions with tests) and the levels are *Not yet verified*, *Basic checks only*, *Good confidence*, *High confidence*.

- **Seller onboarding** (**Get verified** in a seller's panel): who they are (owner, agent or builder), firm, RERA
  registration number, GST number, address, where they work, and documents: an identity document for everyone, a RERA
  certificate for agents, a business document for builders, proof of ownership for owners. They send it for review and
  cannot change it while it is with staff.
- **Staff review** (**Sellers** in the admin panel): staff read the answers, open the documents, and tick what they
  confirmed themselves: identity, RERA registration (looked up on the state register) or ownership, a phone call, the
  address. Approval needs at least the identity tick. They can ask for more or turn a seller down with a message, and
  record upheld buyer complaints. The seller is emailed the outcome.
- **A seller's level**: identity only gives *Basic*; plus RERA/ownership and a phone call gives *Good*; plus address
  gives *High*. Ignoring most buyer enquiries or having many listings turned down takes *High* away; an upheld
  complaint holds a seller at *Basic* until cleared. If a verified seller edits their answers, they go back to
  unverified until staff check again.
- **A home's level**: starts from its seller's level (homes added by staff start at *Basic*). Staff can record that
  they checked a particular home's papers or visited it, saying what they checked; that lifts it to at least *Good*,
  and *High* needs both a trusted seller and that check. No photos caps it at *Good*; a home under construction with
  no RERA number on record, or priced more than 35% below the area average, is capped at *Basic* with a warning. A
  seller editing a listing withdraws staff's check of it.
- **What buyers see**: a badge on every listing card; on the property page a "How confident can you be?" section with
  each reason, ticked or not, and the seller's public page (`/dealers/[id]`, not indexed, no contact details). After
  an enquiry, the buyer is told whether the seller is verified and, if not, warned not to pay any advance.
- **Reports from buyers**: every property page (and the app's property screen) has "Something wrong with this listing
  or seller? Report it": a reason, what happened, and the buyer's name and phone so staff can follow up. A report
  changes nothing by itself, because anyone can send one. Staff are emailed, look into it under **Reports**, and
  uphold or dismiss it with a note of what they found; they can take the listing off the site in the same step, and
  can change the decision later. An upheld report counts as a complaint: the seller is held at *Basic checks only*
  until it is dismissed. The seller is never told who reported them. Limited to three reports a minute per visitor.
  **The buyer hears the outcome**: after sending a report they get a private link (`/report-status/…`, not indexed)
  that shows whether it is being looked into, upheld or dismissed, and if they left an email they are emailed an
  acknowledgement and then the outcome, again if the decision changes. The wording is standard, plus an optional
  message staff write for the buyer; staff's own notes on what they found are never shown to the buyer.
- **Ranking**: listings, locality pages and ask-box results show higher-confidence homes first unless the buyer asks
  for a price order. Nothing is hidden. The assistant is told each home's confidence and not to overstate it.
- **Documents are private**: stored in `apps/api/private-documents` (override with `DOCUMENT_DIR`), a folder no web
  address serves, with files readable only by the API's own account. The API sends a document only to the seller it
  belongs to or to staff, never cached, and logs each time staff open one. They are deleted automatically 90 days
  after the review (`DOCUMENT_RETENTION_DAYS`), or at once from the seller's review page; the record of what was
  verified is kept. They are not encrypted on disk: protect or relocate that folder in production.
- Levels are stored on each listing for ordering and recalculated whenever something they depend on changes, when the
  API starts, and once a day.

Every confidence display says that the checks reduce risk and are not a guarantee, and tells the buyer to see the
home and have a lawyer check the title. **Have a lawyer review this wording, the document handling and your duties
under India's data protection law before launch.**

## Builder projects from the RERA registers

Project pages can be created from the three state regulators' public registers (**RERA registers** in the admin
panel; code in `apps/api/src/rera`). Only facts the registers publish are stored: name, promoter, registration number,
location, status and dates. No other portal is scraped, and nothing behind a login or human check is read.

- **Sources**: Haryana RERA's Gurugram list (one page), Karnataka RERA's Bengaluru Urban list (one request), and
  MahaRERA searched by the pincodes of our own localities (`PINCODES` in `place.ts`), a page at a time with a pause.
  An admin starts a read with "Read now"; it runs in the background, at most once every ten minutes per register,
  retries a dropped connection once, stops at any refusal, and keeps what it had read.
- **Placement**: every entry is kept as fetched in a staging table. It becomes a project page only when it can be
  placed in one of our localities: by map position checked against its pincode (Maharashtra), by the sector or road
  in its location (Haryana, with the aliases in `place.ts`), or by a locality in its registered name. Karnataka gives
  only a taluk, which is never used. Everything else waits under "Not placed yet", where staff can place it by hand.
  `POST /admin/register/recheck` re-applies the rules to automatically placed pages after the rules change.
- **What the page says**: that it comes from the named register and when it was read, with a link to the register's
  own page; that the builder has not confirmed it; a warning when the registration is marked lapsed. It shows no
  price, floor plan or completion status, because the registers do not give them, and its lead form says our own
  team will call. Leads go to staff until a builder login is linked to the project.
- **First read (18 Nov 2026)**: Haryana 1,087 entries, 202 pages; Karnataka 4,152 entries, 8 pages; Maharashtra 373
  entries (two result pages per pincode), 280 pages. Parsers are tested against saved excerpts of the real pages and
  will need updating if a register changes its layout.
- MahaRERA's copyright policy allows reuse with accuracy and acknowledgement of the source. No such policy page was
  found for the Haryana or Karnataka sites; confirm reuse terms for those before launch. Set `RERA_USER_AGENT` to
  identify your reader with a contact address in production.

## Tools that help buyers decide

On the website (linked from **Tools** in the header and from each property page) and in the mobile app (**Tools**
in the header of the ask screen, and on each property screen). The app uses a copy of the same maths
(`apps/mobile/lib/finance.ts` mirrors `apps/web/src/lib/finance.ts`; change both together) and shows the same figures.
In the app the comparison shortlist is kept in memory, so it is forgotten when the app is closed.

- **EMI calculator** (`/tools/emi-calculator`, and on every property page filled in with that home's price): monthly
  instalment, loan amount and total interest from price, down payment, rate and period. The starting interest rate
  (8.75%) is an example the buyer is told to replace with their bank's; change it in `apps/web/src/lib/finance.ts`.
- **How much can I afford?** (`/tools/home-affordability`): a budget from take-home pay, existing EMIs and savings,
  assuming all EMIs may take 45% of pay (adjustable on the page).
- **True cost of buying** (`/tools/cost-of-buying`, and on every property page): stamp duty, registration fee and GST on
  top of the listed price, with a lower stamp duty where the state gives one for a woman buyer. **The rates are stored
  per city and edited under Admin → Cities.** The seeded rates come from public guides (November 2026) that disagree
  on details such as Haryana's registration fee and Karnataka's cess, and nobody has confirmed them against the
  official schedules: buyers are told so until an admin ticks "I have checked these rates" on the city, which shows
  the date instead. GST is 5% of the price for a home under construction (1% up to ₹45 lakh, without checking the size
  limit) and none for a ready home. Everything is labelled an estimate.
- **Compare homes** (`/compare?ids=…`): "+ Compare" on any listing adds it to a shortlist of up to four kept in the
  buyer's browser; the bar at the bottom opens them side by side with the best figure in each row highlighted, including
  estimated total cost and example EMI. Property pages also link to a ready-made comparison with similar homes. Not
  indexed.
- **Compare localities** (`/[city]/compare/[a]-vs-[b]`, e.g. `/gurgaon/compare/golf-course-road-vs-sector-57`):
  two localities of a city side by side with a one-line verdict on which is cheaper. Indexable, with FAQ data; each
  locality page links to comparisons with its nearest neighbours, and the sitemap lists each locality against its two
  nearest. The pair is always written alphabetically; the other order redirects.
- **Ask box**: "Whitefield vs Sarjapur Road" style questions are answered with both areas' figures and a link to the
  comparison page.

The figures were checked against independent calculations (EMI, affordability, and charges in three cities).

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
  account. The sign-up, sign-in and password screens share one interactive design (`apps/web/src/components/auth`):
  fields check themselves as you type, passwords have a show/hide switch and a strength guide, and sign-up starts with
  an "I am an owner / agent / builder" choice that pre-fills the seller's verification profile. Their listings start as *waiting for review* and are not on the site, in answers or in the sitemap until staff
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
  *Not interested*, with a short private note, edited in place on the **Enquiries** / **Leads** screen. That screen
  has a tab with a count for each status, overviews show how many are still new, and the spreadsheet includes status
  and note.
- **Two separate tracks per lead**: your team's status and note are kept apart from those of the outside party the
  lead belongs to (the listing's seller, or the project's builder), so neither overwrites the other. Staff see the
  seller's or builder's status under their own; sellers and builders never see staff's status or notes.
- **History**: every change of status or note is recorded with who made it and when, and shown under the lead as
  "History". Staff see both tracks' history; a seller or builder sees only their own.
- **Reminders**: once a day (9:00 India time; `REMINDER_HOUR_IST`, or `REMINDERS=off`) each seller and builder is
  emailed the leads on their track that are still *New* more than 24 hours after arriving, and staff are emailed the
  ones nobody else is handling (no seller account, no builder login). Leads older than 30 days are left out. It runs
  once a day even across restarts. An admin can preview who is due with `POST /admin/reminders/run`, or send
  immediately with `{"send":"true"}`; there is no button for this in the panel yet.
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
| `/[city]/compare/[a]-vs-[b]` | Two localities side by side | `BreadcrumbList`, `FAQPage` |
| `/tools`, `/tools/…` | EMI, affordability and cost-of-buying calculators | `BreadcrumbList`, `FAQPage` |
| `/post-property` | Sign-up for owners, agents and builders | `FAQPage` |
| `/ask?q=…` | Server-rendered answer | none; `noindex, follow` |
| `/compare?ids=…` | Up to four homes side by side | none; `noindex, follow` |

- Every page is rendered on the server with its content, title, description and canonical URL in the HTML.
- Size pages with no homes, unknown places and removed listings return a real 404.
- The footer links every city and locality from every page; listing pages link to sizes, projects and nearby localities.
- `/sitemap.xml` lists every indexable URL. `/robots.txt` disallows everything unless `ALLOW_INDEXING=true`, so only
  production is crawled. Set `SITE_URL` to the public address there.

## Not done yet

Buyer accounts and saved searches (the comparison shortlist lives only in the browser or the open app), stamp duty slabs and locality-level rates (one rate per city), proper database migrations (the schema is applied with `prisma db push`, which will not add a required column to
a table that already has rows), encryption of verification documents at rest,
assigning a lead to a particular staff member, builders editing their own project pages,
a project screen and lead form in the mobile app, reordering photos, object storage for
photos, pagination beyond 48 homes per listing page, a real listings feed, native speech-to-text on phones, a
Content-Security-Policy header, and deployment.

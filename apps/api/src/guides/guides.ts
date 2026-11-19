/**
 * Short guides for home buyers, written once here and served to the website and the app. They explain the terms and
 * rules the rest of the product leans on (carpet area, RERA registration, the charges on top of a price) in plain
 * words. General information about Indian law as we understand it, not legal advice; each guide says so.
 */
export interface GuideSection { heading: string; paras: string[]; bullets?: string[] }
export interface Guide {
  slug: string;
  /** The page's headline, and a shorter name for cards and links. */
  title: string; short: string;
  summary: string; icon: string; minutes: number;
  /** The three or four things to remember, shown at the top. */
  takeaways: string[];
  sections: GuideSection[];
  /** A tool on this site that puts the guide to use. `app` is the same tool's screen in the app. */
  tool?: { href: string; app: string; label: string };
  faqs: { q: string; a: string }[];
  /** When the text was last reviewed, as a date. */
  reviewed: string;
}

const REVIEWED = '2026-11-19';

export const GUIDES: Guide[] = [
  {
    slug: 'carpet-area-vs-super-built-up-area', short: 'Carpet area vs super built-up', icon: '📐', minutes: 4, reviewed: REVIEWED,
    title: 'Carpet area vs super built-up area: what you actually get',
    summary: 'Two flats quoted at the same rate can differ by a room’s worth of usable floor. Here is what each area means and how to compare them.',
    takeaways: [
      'Carpet area is the floor inside your flat that you can use. It is the only area the law recognises for selling a home.',
      'Super built-up area adds your share of walls, lobbies, lifts and stairs. The gap between the two is called loading, commonly 20% to 40%.',
      'Always compare price per carpet sq ft, with every charge included.',
    ],
    sections: [
      { heading: 'The three areas you will hear', paras: ['Builders and brokers use three different measures of the same flat, and the quoted rate depends on which one they pick.'], bullets: [
        'Carpet area: the net usable floor inside the flat, including the internal partition walls. It leaves out external walls, service shafts, and balconies, verandahs and terraces meant for your exclusive use.',
        'Built-up area: carpet area plus the thickness of the outer walls and, usually, the balconies.',
        'Super built-up area: built-up area plus your share of common areas such as the lobby, staircases, lifts and sometimes the clubhouse.',
      ] },
      { heading: 'What the law says', paras: ['The Real Estate (Regulation and Development) Act, 2016 (RERA) defines carpet area and requires builders to disclose it and to price homes on it. A quote that gives only a super built-up figure is not giving you the number the law is built around. Ask for the carpet area in writing, in square feet.'] },
      { heading: 'Loading, and why it matters', paras: ['Loading is the share of the super built-up area that is not carpet. If a flat is sold as 1,500 sq ft with 30% loading, about 1,050 sq ft is yours to use. With 40% loading the same “1,500 sq ft” gives you 900.', 'That is why the lower rate per sq ft is often not the cheaper home. A flat at ₹6,300 a sq ft with 40% loading costs more per usable foot than one at ₹6,700 with 30%.'] },
      { heading: 'How to compare two quotes', paras: ['Take the whole bill for each flat (basic price, parking, club, location charges, GST, stamp duty and registration) and divide it by the carpet area. That single number, price per usable sq ft, is the fair comparison.'] },
    ],
    tool: { href: '/tools/true-price', app: '/tools/true-price', label: 'Work out your price per carpet sq ft' },
    faqs: [
      { q: 'Is a balcony part of carpet area?', a: 'No. Under RERA’s definition, a balcony or verandah for your exclusive use is left out of carpet area, though builders often charge for it separately. Ask how it is being priced.' },
      { q: 'What is a normal loading?', a: 'There is no fixed figure. In practice it commonly runs from about 20% to 40%, and tends to be higher in projects with large lobbies and many amenities. A builder should be able to tell you the exact carpet area, so you never need to guess.' },
      { q: 'Can a builder sell on super built-up area?', a: 'RERA requires the carpet area to be disclosed and the price to be set on it. Advertising a super built-up figure is still common; what matters is that your agreement states the carpet area and the price for it.' },
    ],
  },
  {
    slug: 'rera-registration-explained', short: 'RERA registration explained', icon: '🏛️', minutes: 5, reviewed: REVIEWED,
    title: 'RERA registration explained, and how to check a project',
    summary: 'What a RERA number proves, what it does not, and what “lapsed” or “registration period over” means for a buyer.',
    takeaways: [
      'Most new projects must be registered with the state’s RERA authority before a single flat is advertised or sold.',
      'The registration end date is the completion date the builder gave the authority.',
      'A registration marked lapsed means there is no valid registration today. Ask for the extension order before paying.',
    ],
    sections: [
      { heading: 'What RERA is', paras: ['RERA is a 2016 central law, run by an authority in each state. It makes builders register their projects, publish the facts about them, keep buyers’ money for the project it was paid for, and pay interest if they hand over late.'] },
      { heading: 'Which projects must register', paras: ['A project must be registered if the land is larger than 500 square metres or it has more than eight apartments, counting all phases. Each phase is registered separately, so a large project can carry several registration numbers.', 'A builder may not advertise, market, book or sell in a project that needs registration and does not have it.'] },
      { heading: 'What the registration tells you', paras: ['Each registration carries a number, the promoter’s name, the location, and a validity period. The end of that period is the date the builder told the authority the project would be finished. We show it on every project page that comes from a register.'] },
      { heading: 'Reading the status', paras: ['A project page here shows one of three states.'], bullets: [
        'Registration current: the end date is in the future. The project is still within the time the builder promised.',
        'Registration period over: the end date has passed. Often the building is finished; ask for the occupation certificate to be sure.',
        'Lapsed: the register itself marks the registration as lapsed. The builder needed an extension and none is on record. Do not pay until you have seen the extension order.',
      ] },
      { heading: 'How to check for yourself', paras: ['Open the state authority’s website, search by the registration number, and confirm that the project name, promoter and location match what you are being sold. Every register project page here links to the register’s own page for that project.'] },
      { heading: 'What registration does not prove', paras: ['Registration is not a quality mark, and it is not a promise that the builder will finish on time. It means the builder has filed the required documents and can be held to them. Look also at the builder’s other projects: how many are past their date or lapsed.'] },
    ],
    faqs: [
      { q: 'Is it safe to buy in a RERA-registered project?', a: 'It is safer than buying in an unregistered one, because you have a regulator to complain to and the builder’s commitments are on record. It does not remove the risk of delay, so check the builder’s track record too.' },
      { q: 'Can I buy in a project whose registration has lapsed?', a: 'A builder without a valid registration should not be selling. Ask for the authority’s extension order. If there is none, treat it as a serious warning.' },
      { q: 'Where is the RERA number shown?', a: 'By law it must appear on the builder’s advertisements and brochures, and on your agreement for sale. Check that it matches the number on the state register.' },
    ],
  },
  {
    slug: 'booking-amount-and-agreement-for-sale', short: 'Booking amount and the agreement', icon: '✍️', minutes: 4, reviewed: REVIEWED,
    title: 'Booking amount and the agreement for sale: the 10% rule',
    summary: 'How much a builder may take before the agreement, where your money must go, and what the agreement should say.',
    takeaways: [
      'A builder may not take more than 10% of the price before a written agreement for sale is signed and registered.',
      'Seventy percent of what buyers pay must be kept in a separate bank account for that project.',
      'Pay by cheque or transfer to the project’s account, never in cash, and keep every receipt.',
    ],
    sections: [
      { heading: 'The 10% rule', paras: ['Under RERA, a promoter cannot accept more than ten percent of the cost of the flat as an advance or application fee without first entering into a written agreement for sale and registering it. If you are asked for more than that on a booking form or allotment letter alone, ask for the agreement first.'] },
      { heading: 'Where your money goes', paras: ['Seventy percent of the amounts collected from buyers must be deposited in a separate account, to be used only for the land and construction cost of that project, and withdrawn in step with the progress of the work as certified by an engineer, an architect and a chartered accountant. It exists to stop money being moved from one project to another.'] },
      { heading: 'What the agreement for sale should contain', paras: ['The agreement is the document your rights rest on. Read it before paying beyond the booking amount.'], bullets: [
        'The carpet area of the flat, in square metres or feet, and the total price for it.',
        'Every other charge, itemised: parking, club, maintenance deposit, taxes.',
        'The payment schedule, linked to stages of construction.',
        'The date of possession, and the interest the builder pays for each month of delay.',
        'The RERA registration number of the project.',
        'What happens if either side cancels.',
      ] },
      { heading: 'Before you sign', paras: ['Have a lawyer you chose read the agreement, the title papers and the approved plans. A lawyer suggested by the seller works for the seller.'] },
    ],
    faqs: [
      { q: 'What is a typical booking amount?', a: 'Builders commonly ask for a token of ₹1 lakh to ₹5 lakh, or a few percent of the price, to hold a flat. Whatever the amount, the total taken before a registered agreement must not pass 10% of the price.' },
      { q: 'Is the booking amount refundable?', a: 'It depends on the booking form and agreement, which usually allow the builder to keep part of it if you cancel. Read the cancellation clause before paying, and get the terms in writing.' },
      { q: 'Should I pay any part in cash?', a: 'No. Cash leaves no record, cannot be financed by a bank loan, and weakens any claim you may later need to make. Pay only by cheque or bank transfer to the project account named in the agreement.' },
    ],
  },
  {
    slug: 'how-to-read-a-builder-cost-sheet', short: 'Reading a cost sheet', icon: '🧾', minutes: 5, reviewed: REVIEWED,
    title: 'How to read a builder’s cost sheet',
    summary: 'The basic price is only the first line. These are the charges that follow it, which ones are negotiable, and what to ask about each.',
    takeaways: [
      'Ask for every charge on one sheet before you book, not after.',
      'Extras and government charges commonly add 12% to 20% to the basic price of an under-construction home.',
      'Compare cost sheets on the final total and on price per carpet sq ft, never on the basic rate alone.',
    ],
    sections: [
      { heading: 'The lines you will see', paras: ['Names vary from builder to builder, but most cost sheets are made of the same parts.'], bullets: [
        'Basic sale price: the rate multiplied by an area. Check which area.',
        'Preferential location charge (PLC): extra for a park-facing, corner or higher flat.',
        'Floor rise: a per-floor addition in a tower.',
        'Car parking: often sold separately, covered or open.',
        'Club membership and development charges: for the clubhouse and site infrastructure.',
        'Maintenance deposit or advance maintenance: often one or two years collected up front.',
        'Legal, documentation or administration fees.',
        'Utility connection charges: electricity, water, gas, sometimes a meter deposit.',
      ] },
      { heading: 'Charges that go to the government', paras: ['On top of the builder’s charges come taxes and duties.'], bullets: [
        'GST: charged on a home bought while it is under construction. None on a completed home.',
        'Stamp duty: a state tax on the transfer, a percentage of the price or the official value, whichever is higher.',
        'Registration fee: paid to register the sale deed.',
      ] },
      { heading: 'What to ask', paras: ['Three questions settle most surprises.'], bullets: [
        'Is this the complete list? Ask the sales person to write “no other charges” on the sheet.',
        'Which charges are refundable deposits, and which are not?',
        'Will any charge change before possession, and what is the limit on that change?',
      ] },
      { heading: 'What can be negotiated', paras: ['Government charges cannot. The builder’s own charges often can: the basic rate, PLC, floor rise, parking and the club fee are the usual places a discount is found, especially near a quarter end or in a project with many unsold flats.'] },
    ],
    tool: { href: '/tools/true-price', app: '/tools/true-price', label: 'Add up a quote and compare it with another' },
    faqs: [
      { q: 'What are “other charges” on a cost sheet?', a: 'A catch-all that can hold development charges, club fees, legal fees and utility connections. Ask for it to be broken into named items with an amount each.' },
      { q: 'Is parking included in the price?', a: 'Usually not. Covered parking is commonly a separate line of a few lakh rupees. Confirm whether the space is allotted to your flat in the agreement.' },
      { q: 'Is the maintenance deposit refundable?', a: 'An advance for maintenance is spent on upkeep and is not returned. A “corpus” or security deposit is usually handed over to the residents’ association. Ask which one it is.' },
    ],
  },
  {
    slug: 'under-construction-vs-ready-to-move', short: 'Under construction vs ready', icon: '🏗️', minutes: 4, reviewed: REVIEWED,
    title: 'Under construction or ready to move: which costs more?',
    summary: 'An under-construction flat looks cheaper. Add GST, rent while you wait and the risk of delay, and the gap narrows or reverses.',
    takeaways: [
      'An under-construction home carries GST; a completed one does not.',
      'While you wait for possession you may be paying rent and loan interest together.',
      'A ready home lets you see exactly what you are buying, and move in.',
    ],
    sections: [
      { heading: 'What you pay in tax', paras: ['GST applies to a home bought before the building is completed: 5% of the price for most homes, and 1% for homes that qualify as affordable housing. Once the building has its completion certificate there is no GST on the sale. On a ₹1 crore flat that is ₹5 lakh.', 'Stamp duty and registration are paid on both.'] },
      { heading: 'What you pay while you wait', paras: ['If you rent now, you keep paying rent until possession. If you take a loan, the bank releases it in stages and you pay interest on what has been released, often called pre-EMI. For a few years you can be paying for two homes and living in one.'] },
      { heading: 'The risk of delay', paras: ['The date in your agreement is a promise, not a certainty. RERA gives you interest for each month of delay, but that does not house you. Before choosing an under-construction project, look at how the builder’s other projects have done against their registered dates.'] },
      { heading: 'What under construction gives you', paras: ['A lower entry price, payment spread over the build, more choice of floor and facing, and a new building. If you do not need to move soon and the builder’s record is clean, that can be the better deal.'] },
      { heading: 'A fair comparison', paras: ['Add to the under-construction price: GST, plus the rent you will pay until possession, plus a few months’ margin for delay. Compare that total with the ready home’s price.'] },
    ],
    tool: { href: '/tools/delay-cost', app: '/tools/delay-cost', label: 'See what waiting, or a delay, would cost you' },
    faqs: [
      { q: 'Is there GST on a ready-to-move flat?', a: 'No. GST applies only while the home is under construction. After the completion certificate is issued, the sale carries no GST.' },
      { q: 'What is pre-EMI?', a: 'While a loan is being released in stages during construction, the bank charges interest only on the amount released so far. That monthly interest is the pre-EMI. Full EMIs, which also repay the loan, usually begin after possession.' },
      { q: 'Are under-construction flats always cheaper?', a: 'The quoted price usually is. After GST, rent during the wait and the cost of any delay, the difference is often smaller than it looks, and sometimes there is none.' },
    ],
  },
  {
    slug: 'possession-delay-your-rights', short: 'If possession is delayed', icon: '⏳', minutes: 4, reviewed: REVIEWED,
    title: 'If possession is delayed: your rights under RERA',
    summary: 'What the builder owes you when a home is handed over late, the two choices the law gives you, and how to use them.',
    takeaways: [
      'If the builder misses the possession date, you may stay and be paid interest for every month of delay, or leave and get your money back with interest.',
      'The interest rate is set by each state’s rules, commonly the State Bank of India’s lending rate plus 2%.',
      'A complaint goes to the state RERA authority, which you can file yourself.',
    ],
    sections: [
      { heading: 'Your two choices', paras: ['When a builder fails to give possession by the date in the agreement for sale, RERA gives the buyer a choice.'], bullets: [
        'Stay in the project, and be paid interest for every month of delay until the home is handed over.',
        'Withdraw from the project, and be refunded the amount paid, with interest and compensation.',
      ] },
      { heading: 'Which date counts', paras: ['The date in your agreement for sale. The end of the project’s RERA registration is the builder’s declared completion date for the whole project and is a useful check, but your claim rests on the date in your own agreement.'] },
      { heading: 'How the interest is worked out', paras: ['It is charged on the money you have paid, for the period of delay, at the rate in your state’s RERA rules. In many states that is SBI’s highest marginal cost of lending rate plus two percent. The same rate applies to you if you pay an instalment late.'] },
      { heading: 'How to claim', paras: ['Write to the builder first and keep a copy. If that fails, file a complaint with the state RERA authority, online in most states, with your agreement, payment receipts and correspondence. The authority can order interest, a refund and compensation.', 'Orders are not always obeyed quickly. Buyers’ surveys consistently report that getting an order carried out is the hard part, so act early and keep your papers in order.'] },
      { heading: 'Before you buy', paras: ['The best protection is choosing well. Check how many of the builder’s other projects are past their registered date or marked lapsed. Every builder page here shows that count from the public register.'] },
    ],
    tool: { href: '/tools/delay-cost', app: '/tools/delay-cost', label: 'Work out what a delay costs you and what you are owed' },
    faqs: [
      { q: 'Can the builder extend the date by pointing to a clause in the agreement?', a: 'Agreements often allow extra time for events outside the builder’s control. Whether a particular delay is covered is for the authority to decide; a general “grace period” does not remove your right to interest for an unjustified delay.' },
      { q: 'What if the RERA registration itself was extended?', a: 'An extension granted by the authority lets the builder go on with the project. It does not by itself change the possession date in your agreement or your right to interest.' },
      { q: 'How long does a RERA complaint take?', a: 'The Act aims for disposal within sixty days, but in practice it varies widely by state and by case. Plan for months, not weeks.' },
    ],
  },
  {
    slug: 'occupation-certificate-explained', short: 'Occupation certificate', icon: '🔑', minutes: 3, reviewed: REVIEWED,
    title: 'Occupation certificate: why you should not move in without one',
    summary: 'A finished-looking building is not a legally finished one. The occupation certificate is the paper that says it is.',
    takeaways: [
      'The occupation certificate (OC) is issued by the local authority when a building is built to the approved plan and is fit to live in.',
      'Without it, the builder should not offer possession, and services such as water and power may not be regular connections.',
      'Ask to see the OC for your tower before taking possession or paying the last instalment.',
    ],
    sections: [
      { heading: 'Three certificates, in order', paras: ['A building passes three points on paper.'], bullets: [
        'Commencement certificate: permission to start building to the approved plan.',
        'Completion certificate: confirmation that the building was built according to that plan.',
        'Occupation certificate: permission to occupy, confirming the building is safe and has its services.',
      ] },
      { heading: 'Why it matters to you', paras: ['Possession offered without an occupation certificate is possession of a building the authority has not cleared. Banks may refuse the final loan disbursal, the sale deed may not be registered, and a permanent water or electricity connection may not be given. If something was built beyond the approved plan, the consequences fall on the people living there.'] },
      { heading: 'A project past its registration date', paras: ['When a project’s RERA registration period is over, the building is often complete. The register does not say so, which is why our project pages say “registration period over” and not “ready to move”. The occupation certificate is how you tell the difference.'] },
      { heading: 'What to ask for', paras: ['A copy of the occupation certificate that names your tower or phase, since large projects get them one phase at a time. A “part OC” covers only the part it names.'] },
    ],
    faqs: [
      { q: 'Can I take possession without an OC?', a: 'A builder should not offer possession before the occupation certificate is issued, and you take on real risk if you accept. Ask for the certificate first.' },
      { q: 'Who issues the occupation certificate?', a: 'The local planning or municipal authority that approved the building plan, after inspecting the finished building. The builder applies for it.' },
      { q: 'Is a completion certificate the same as an occupation certificate?', a: 'No. The completion certificate says the building follows the approved plan; the occupation certificate says people may live in it. Some authorities issue them together.' },
    ],
  },
];

/** What a list of guides needs: everything but the body. */
export const guideCards = () => GUIDES.map(({ slug, title, short, summary, icon, minutes }) => ({ slug, title, short, summary, icon, minutes }));
export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;

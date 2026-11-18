/**
 * The places the site covers: four cities, their localities and each city's buying charges.
 * No homes or projects are created here.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Loc = { name: string; lat: number; lng: number; highlights: string[] };
/** Government charges on a purchase. Taken from public guides in November 2026, which disagree on some details: nobody on the team has confirmed them, so they are seeded as unreviewed. */
type Costs = { stampDutyPct: number; stampDutyWomenPct: number; registrationPct: number; registrationCapInr: number | null; costNote: string };
type CitySeed = { name: string; state: string; lat: number; lng: number; intro: string; costs: Costs; localities: Loc[] };

const CITIES: CitySeed[] = [
  {
    name: 'Gurgaon', state: 'Haryana', lat: 28.4595, lng: 77.0266,
    costs: { stampDutyPct: 7, stampDutyWomenPct: 5, registrationPct: 1, registrationCapInr: 50000, costNote: 'Rates for property inside municipal limits; joint ownership is charged 6%. Haryana\'s registration fee follows a slab table, estimated here as 1% up to ₹50,000. Duty is charged on the higher of the price and the circle rate.' },
    intro: 'Gurgaon (Gurugram) is the corporate hub of the National Capital Region, with homes clustered along Golf Course Road, Sohna Road, the Dwarka Expressway and New Gurgaon.',
    localities: [
      { name: 'Sector 57', lat: 28.4229, lng: 77.0773, highlights: ['Rapid Metro at Sector 55-56, 2 km', 'Golf Course Extension Road, 5 minutes', 'Established schools and markets'] },
      { name: 'Golf Course Road', lat: 28.4412, lng: 77.1005, highlights: ['Rapid Metro along the road', 'Cyber City in 15 minutes', 'Premium high-rise towers'] },
      { name: 'Sohna Road', lat: 28.4089, lng: 77.0419, highlights: ['Direct link to NH-48', 'Office parks along the corridor', 'Wide choice of mid-segment societies'] },
      { name: 'Dwarka Expressway', lat: 28.4985, lng: 76.9930, highlights: ['IGI Airport in 20 minutes', 'New signal-free expressway', 'Mostly new and under-construction projects'] },
      { name: 'Sector 82', lat: 28.3915, lng: 76.9610, highlights: ['NH-48 access', 'Close to IMT Manesar', 'Township-style developments'] },
      { name: 'DLF Phase 3', lat: 28.4930, lng: 77.0940, highlights: ['Walk to Cyber City', 'Yellow Line and Rapid Metro nearby', 'Builder floors and independent houses'] },
    ],
  },
  {
    name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946,
    costs: { stampDutyPct: 5.6, stampDutyWomenPct: 5.6, registrationPct: 2, registrationCapInr: null, costNote: 'Stamp duty of 5% plus cess and surcharge, about 5.6% in all, for homes above ₹45 lakh; homes under ₹45 lakh are charged less (3%, or 2% under ₹20 lakh), so this overstates their cost. Registration is 2% since August 2025.' },
    intro: 'Bengaluru is India\'s technology capital. Buyers mostly choose between the eastern IT corridor around Whitefield and Sarjapur Road, the north near the airport, and the settled south.',
    localities: [
      { name: 'Whitefield', lat: 12.9698, lng: 77.7500, highlights: ['Purple Line metro', 'ITPL and EPIP tech parks', 'International schools'] },
      { name: 'Sarjapur Road', lat: 12.9100, lng: 77.6870, highlights: ['Close to Outer Ring Road offices', 'Large gated communities', 'Upcoming metro line'] },
      { name: 'HSR Layout', lat: 12.9116, lng: 77.6474, highlights: ['Planned sectors with parks', 'Startup and cafe hub', 'Quick access to Koramangala'] },
      { name: 'Hebbal', lat: 13.0358, lng: 77.5970, highlights: ['Airport in 30 minutes', 'Manyata Tech Park nearby', 'Lake-facing towers'] },
      { name: 'Electronic City', lat: 12.8452, lng: 77.6602, highlights: ['Infosys and Wipro campuses', 'Elevated expressway to Silk Board', 'Most affordable IT-corridor homes'] },
      { name: 'Yelahanka', lat: 13.1007, lng: 77.5963, highlights: ['Closest suburb to the airport', 'Wide roads and low density', 'Plots and villas available'] },
    ],
  },
  {
    name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777,
    costs: { stampDutyPct: 6, stampDutyWomenPct: 5, registrationPct: 1, registrationCapInr: 30000, costNote: 'Mumbai rate including the 1% metro cess. Thane and Mira Road are charged about 1% more. Registration is 1%, limited to ₹30,000.' },
    intro: 'Mumbai is India\'s most expensive housing market. Budgets stretch furthest in Thane and the western suburbs beyond Borivali, while Powai, Andheri and Chembur balance commute and price.',
    localities: [
      { name: 'Powai', lat: 19.1176, lng: 72.9060, highlights: ['Lake views and Hiranandani township', 'Close to SEEPZ and Vikhroli offices', 'Metro Line 6 under construction'] },
      { name: 'Andheri West', lat: 19.1364, lng: 72.8296, highlights: ['Metro Lines 1 and 2A', 'Lokhandwala and Versova markets', 'Airport in 20 minutes'] },
      { name: 'Thane West', lat: 19.2183, lng: 72.9781, highlights: ['Ghodbunder Road townships', 'Metro Line 4 under construction', 'More space for the budget'] },
      { name: 'Chembur', lat: 19.0522, lng: 72.9005, highlights: ['Eastern Freeway to South Mumbai', 'Monorail and Metro 2B', 'Close to BKC'] },
      { name: 'Borivali West', lat: 19.2307, lng: 72.8567, highlights: ['Western line fast trains', 'Metro Line 2A', 'National Park nearby'] },
      { name: 'Mira Road', lat: 19.2813, lng: 72.8680, highlights: ['Most affordable on the western line', 'Metro Line 9 under construction', 'Large planned complexes'] },
    ],
  },
  {
    name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567,
    costs: { stampDutyPct: 7, stampDutyWomenPct: 6, registrationPct: 1, registrationCapInr: 30000, costNote: 'Includes the metro cess and local body tax. Registration is 1%, limited to ₹30,000.' },
    intro: 'Pune\'s demand follows its IT parks: Hinjewadi and Wakad in the west, Kharadi and Viman Nagar in the east, with Baner as the premium middle ground.',
    localities: [
      { name: 'Hinjewadi', lat: 18.5913, lng: 73.7389, highlights: ['Rajiv Gandhi Infotech Park', 'Metro Line 3 under construction', 'Many new launches'] },
      { name: 'Baner', lat: 18.5590, lng: 73.7868, highlights: ['Mumbai-Pune highway access', 'Balewadi High Street', 'Premium mid-rise societies'] },
      { name: 'Kharadi', lat: 18.5515, lng: 73.9348, highlights: ['EON IT Park and World Trade Center', 'Airport in 20 minutes', 'Riverside towers'] },
      { name: 'Wakad', lat: 18.5987, lng: 73.7688, highlights: ['Between Hinjewadi and Baner', 'Highway and metro access', 'Family-oriented societies'] },
      { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143, highlights: ['Next to the airport', 'Phoenix Marketcity', 'Established and green'] },
      { name: 'Hadapsar', lat: 18.5089, lng: 73.9259, highlights: ['Magarpatta and Amanora townships', 'SP Infocity', 'Good for first-time buyers'] },
    ],
  },
];

async function main() {
  // Places only: the cities and localities the site covers. Nothing is deleted or overwritten, so this is safe to run
  // again on a database that already holds real listings, register projects and rates an admin has corrected.
  // Homes and projects are never invented here: they come from sellers, builders and the RERA registers.
  let added = 0;
  for (const c of CITIES) {
    const city = await prisma.city.upsert({ where: { slug: slugify(c.name) }, update: {}, create: { slug: slugify(c.name), name: c.name, state: c.state, intro: c.intro, lat: c.lat, lng: c.lng, ...c.costs } });
    for (const l of c.localities) {
      const slug = slugify(l.name);
      if (await prisma.locality.findFirst({ where: { cityId: city.id, slug } })) continue;
      await prisma.locality.create({ data: { slug, name: l.name, cityId: city.id, lat: l.lat, lng: l.lng, highlights: l.highlights, intro: `${l.name} is a residential area of ${c.name}, ${c.state}.` } });
      added++;
    }
  }
  console.log(`${CITIES.length} cities and ${CITIES.reduce((n, c) => n + c.localities.length, 0)} localities in place (${added} added).`);
}

main().finally(() => prisma.$disconnect());

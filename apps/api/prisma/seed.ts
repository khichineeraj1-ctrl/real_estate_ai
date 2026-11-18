/**
 * Seed data for local development. Everything here is generated: project names, builders, RERA numbers and
 * prices are made up, shaped like the real thing so a listing feed can replace this file later.
 */
import { PrismaClient, ConstructionStatus, ListedBy, PropertyType } from '@prisma/client';

const prisma = new PrismaClient();

// Small seeded generator so every run produces the same catalogue (stable URLs).
let seed = 20261118;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = <T>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
const between = (a: number, b: number) => Math.round(a + rnd() * (b - a));
const some = <T>(xs: T[], n: number): T[] => [...xs].sort(() => rnd() - 0.5).slice(0, n);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Loc = { name: string; rate: number; lat: number; lng: number; highlights: string[] };
/** Government charges on a purchase. Taken from public guides in November 2026, which disagree on some details: nobody on the team has confirmed them, so they are seeded as unreviewed. */
type Costs = { stampDutyPct: number; stampDutyWomenPct: number; registrationPct: number; registrationCapInr: number | null; costNote: string };
type CitySeed = { name: string; state: string; lat: number; lng: number; rera: string; intro: string; costs: Costs; localities: Loc[] };

const CITIES: CitySeed[] = [
  {
    name: 'Gurgaon', state: 'Haryana', lat: 28.4595, lng: 77.0266, rera: 'RC/REP/HARERA/GGM',
    costs: { stampDutyPct: 7, stampDutyWomenPct: 5, registrationPct: 1, registrationCapInr: 50000, costNote: 'Rates for property inside municipal limits; joint ownership is charged 6%. Haryana\'s registration fee follows a slab table, estimated here as 1% up to ₹50,000. Duty is charged on the higher of the price and the circle rate.' },
    intro: 'Gurgaon (Gurugram) is the corporate hub of the National Capital Region, with homes clustered along Golf Course Road, Sohna Road, the Dwarka Expressway and New Gurgaon.',
    localities: [
      { name: 'Sector 57', rate: 11500, lat: 28.4229, lng: 77.0773, highlights: ['Rapid Metro at Sector 55-56, 2 km', 'Golf Course Extension Road, 5 minutes', 'Established schools and markets'] },
      { name: 'Golf Course Road', rate: 21000, lat: 28.4412, lng: 77.1005, highlights: ['Rapid Metro along the road', 'Cyber City in 15 minutes', 'Premium high-rise towers'] },
      { name: 'Sohna Road', rate: 10500, lat: 28.4089, lng: 77.0419, highlights: ['Direct link to NH-48', 'Office parks along the corridor', 'Wide choice of mid-segment societies'] },
      { name: 'Dwarka Expressway', rate: 12500, lat: 28.4985, lng: 76.9930, highlights: ['IGI Airport in 20 minutes', 'New signal-free expressway', 'Mostly new and under-construction projects'] },
      { name: 'Sector 82', rate: 8800, lat: 28.3915, lng: 76.9610, highlights: ['NH-48 access', 'Close to IMT Manesar', 'Township-style developments'] },
      { name: 'DLF Phase 3', rate: 14500, lat: 28.4930, lng: 77.0940, highlights: ['Walk to Cyber City', 'Yellow Line and Rapid Metro nearby', 'Builder floors and independent houses'] },
    ],
  },
  {
    name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, rera: 'PRM/KA/RERA/1251',
    costs: { stampDutyPct: 5.6, stampDutyWomenPct: 5.6, registrationPct: 2, registrationCapInr: null, costNote: 'Stamp duty of 5% plus cess and surcharge, about 5.6% in all, for homes above ₹45 lakh; homes under ₹45 lakh are charged less (3%, or 2% under ₹20 lakh), so this overstates their cost. Registration is 2% since August 2025.' },
    intro: 'Bengaluru is India\'s technology capital. Buyers mostly choose between the eastern IT corridor around Whitefield and Sarjapur Road, the north near the airport, and the settled south.',
    localities: [
      { name: 'Whitefield', rate: 10200, lat: 12.9698, lng: 77.7500, highlights: ['Purple Line metro', 'ITPL and EPIP tech parks', 'International schools'] },
      { name: 'Sarjapur Road', rate: 9600, lat: 12.9100, lng: 77.6870, highlights: ['Close to Outer Ring Road offices', 'Large gated communities', 'Upcoming metro line'] },
      { name: 'HSR Layout', rate: 12800, lat: 12.9116, lng: 77.6474, highlights: ['Planned sectors with parks', 'Startup and cafe hub', 'Quick access to Koramangala'] },
      { name: 'Hebbal', rate: 11800, lat: 13.0358, lng: 77.5970, highlights: ['Airport in 30 minutes', 'Manyata Tech Park nearby', 'Lake-facing towers'] },
      { name: 'Electronic City', rate: 6800, lat: 12.8452, lng: 77.6602, highlights: ['Infosys and Wipro campuses', 'Elevated expressway to Silk Board', 'Most affordable IT-corridor homes'] },
      { name: 'Yelahanka', rate: 7900, lat: 13.1007, lng: 77.5963, highlights: ['Closest suburb to the airport', 'Wide roads and low density', 'Plots and villas available'] },
    ],
  },
  {
    name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, rera: 'P518000',
    costs: { stampDutyPct: 6, stampDutyWomenPct: 5, registrationPct: 1, registrationCapInr: 30000, costNote: 'Mumbai rate including the 1% metro cess. Thane and Mira Road are charged about 1% more. Registration is 1%, limited to ₹30,000.' },
    intro: 'Mumbai is India\'s most expensive housing market. Budgets stretch furthest in Thane and the western suburbs beyond Borivali, while Powai, Andheri and Chembur balance commute and price.',
    localities: [
      { name: 'Powai', rate: 31000, lat: 19.1176, lng: 72.9060, highlights: ['Lake views and Hiranandani township', 'Close to SEEPZ and Vikhroli offices', 'Metro Line 6 under construction'] },
      { name: 'Andheri West', rate: 34000, lat: 19.1364, lng: 72.8296, highlights: ['Metro Lines 1 and 2A', 'Lokhandwala and Versova markets', 'Airport in 20 minutes'] },
      { name: 'Thane West', rate: 17500, lat: 19.2183, lng: 72.9781, highlights: ['Ghodbunder Road townships', 'Metro Line 4 under construction', 'More space for the budget'] },
      { name: 'Chembur', rate: 26000, lat: 19.0522, lng: 72.9005, highlights: ['Eastern Freeway to South Mumbai', 'Monorail and Metro 2B', 'Close to BKC'] },
      { name: 'Borivali West', rate: 24500, lat: 19.2307, lng: 72.8567, highlights: ['Western line fast trains', 'Metro Line 2A', 'National Park nearby'] },
      { name: 'Mira Road', rate: 12500, lat: 19.2813, lng: 72.8680, highlights: ['Most affordable on the western line', 'Metro Line 9 under construction', 'Large planned complexes'] },
    ],
  },
  {
    name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, rera: 'P521000',
    costs: { stampDutyPct: 7, stampDutyWomenPct: 6, registrationPct: 1, registrationCapInr: 30000, costNote: 'Includes the metro cess and local body tax. Registration is 1%, limited to ₹30,000.' },
    intro: 'Pune\'s demand follows its IT parks: Hinjewadi and Wakad in the west, Kharadi and Viman Nagar in the east, with Baner as the premium middle ground.',
    localities: [
      { name: 'Hinjewadi', rate: 8200, lat: 18.5913, lng: 73.7389, highlights: ['Rajiv Gandhi Infotech Park', 'Metro Line 3 under construction', 'Many new launches'] },
      { name: 'Baner', rate: 12200, lat: 18.5590, lng: 73.7868, highlights: ['Mumbai-Pune highway access', 'Balewadi High Street', 'Premium mid-rise societies'] },
      { name: 'Kharadi', rate: 10800, lat: 18.5515, lng: 73.9348, highlights: ['EON IT Park and World Trade Center', 'Airport in 20 minutes', 'Riverside towers'] },
      { name: 'Wakad', rate: 9100, lat: 18.5987, lng: 73.7688, highlights: ['Between Hinjewadi and Baner', 'Highway and metro access', 'Family-oriented societies'] },
      { name: 'Viman Nagar', rate: 12900, lat: 18.5679, lng: 73.9143, highlights: ['Next to the airport', 'Phoenix Marketcity', 'Established and green'] },
      { name: 'Hadapsar', rate: 8900, lat: 18.5089, lng: 73.9259, highlights: ['Magarpatta and Amanora townships', 'SP Infocity', 'Good for first-time buyers'] },
    ],
  },
];

const BUILDERS = ['Aravali Homes', 'Suncrest Developers', 'Meridian Realty', 'Banyan Estates', 'Northlight Group', 'Kaveri Constructions', 'Skyline Habitat', 'Greenleaf Infra'];
const PROJECT_WORDS = ['Heights', 'Residences', 'Greens', 'Park', 'Enclave', 'Vista', 'Courtyard', 'Towers'];
const PROJECT_FIRST = ['Palm', 'Silver Oak', 'Lotus', 'Emerald', 'Maple', 'Orchid', 'Cedar', 'Amber', 'Ivory', 'Coral', 'Sapphire', 'Willow'];
const AMENITIES = ['Clubhouse', 'Swimming pool', 'Gym', 'Children\'s play area', 'Power backup', '24x7 security', 'Covered parking', 'Jogging track', 'Indoor games', 'Landscaped gardens', 'Rainwater harvesting', 'EV charging'];
const FACING = ['East', 'North', 'North-East', 'West', 'South', 'North-West'];
const FURNISHING = ['Unfurnished', 'Semi-furnished', 'Furnished'];

const TYPE_LABEL: Record<PropertyType, string> = { APARTMENT: 'Flat', VILLA: 'Villa', BUILDER_FLOOR: 'Builder Floor', PLOT: 'Plot' };

function areaFor(type: PropertyType, bhk: number) {
  if (type === 'PLOT') return between(900, 2700);
  const base = { 1: [520, 720], 2: [880, 1250], 3: [1350, 1950], 4: [2100, 3200] }[bhk] ?? [1000, 1500];
  const a = between(base[0], base[1]);
  return type === 'VILLA' ? Math.round(a * 1.5) : a;
}

async function main() {
  await prisma.property.deleteMany();
  await prisma.project.deleteMany();
  await prisma.locality.deleteMany();
  await prisma.city.deleteMany();

  const usedProjects = new Set<string>();
  let n = 0;
  for (const c of CITIES) {
    const city = await prisma.city.create({ data: { slug: slugify(c.name), name: c.name, state: c.state, intro: c.intro, lat: c.lat, lng: c.lng, ...c.costs } });
    for (const l of c.localities) {
      const locality = await prisma.locality.create({
        data: {
          slug: slugify(l.name), name: l.name, cityId: city.id, lat: l.lat, lng: l.lng, highlights: l.highlights,
          intro: `${l.name} is a residential area of ${c.name}, ${c.state}.`,
        },
      });

      const projects = [];
      for (let p = 0; p < 2; p++) {
        let name = '';
        do { name = `${pick(BUILDERS).split(' ')[0]} ${pick(PROJECT_FIRST)} ${pick(PROJECT_WORDS)}`; } while (usedProjects.has(name));
        usedProjects.add(name);
        const status: ConstructionStatus = rnd() < 0.55 ? 'READY_TO_MOVE' : 'UNDER_CONSTRUCTION';
        const possession = status === 'UNDER_CONSTRUCTION' ? new Date(Date.UTC(2027 + between(0, 2), between(0, 11), 1)) : null;
        const builder = BUILDERS.find((b) => b.startsWith(name.split(' ')[0]))!;
        projects.push(await prisma.project.create({
          data: {
            slug: slugify(`${name} ${l.name} ${c.name}`), name, builder, status, possession, localityId: locality.id,
            reraId: `${c.rera}/${between(100, 999)}/${between(2021, 2026)}`, totalUnits: between(120, 900), amenities: some(AMENITIES, 7),
            description: `${name} by ${builder} is a ${status === 'READY_TO_MOVE' ? 'ready-to-move' : 'under-construction'} residential project in ${l.name}, ${c.name}, offering 2, 3 and 4 BHK homes.`,
          },
        }));
      }

      const count = between(8, 11);
      for (let i = 0; i < count; i++) {
        const roll = rnd();
        const type: PropertyType = roll < 0.7 ? 'APARTMENT' : roll < 0.84 ? 'BUILDER_FLOOR' : roll < 0.94 ? 'VILLA' : 'PLOT';
        const bhk = type === 'PLOT' ? 0 : type === 'VILLA' ? pick([3, 4, 4]) : pick([1, 2, 2, 3, 3, 3, 4]);
        const project = type === 'APARTMENT' && rnd() < 0.75 ? pick(projects) : null;
        const status: ConstructionStatus = project ? project.status : type === 'PLOT' ? 'READY_TO_MOVE' : rnd() < 0.8 ? 'READY_TO_MOVE' : 'UNDER_CONSTRUCTION';
        const areaSqft = areaFor(type, bhk);
        const rate = l.rate * (0.85 + rnd() * 0.35) * (type === 'VILLA' ? 1.25 : type === 'PLOT' ? 0.9 : 1);
        const priceInr = Math.round((areaSqft * rate) / 50000) * 50000;
        const totalFloors = type === 'APARTMENT' ? between(8, 32) : type === 'BUILDER_FLOOR' ? 4 : null;
        const floor = totalFloors ? between(1, totalFloors) : null;
        const label = type === 'PLOT' ? `${areaSqft} sq ft Residential Plot` : `${bhk} BHK ${TYPE_LABEL[type]}`;
        const title = `${label} in ${project ? `${project.name}, ` : ''}${l.name}, ${c.name}`;
        const furnishing = type === 'PLOT' || status === 'UNDER_CONSTRUCTION' ? null : pick(FURNISHING);
        const facing = pick(FACING);
        n++;
        await prisma.property.create({
          data: {
            slug: `${slugify(`${label} ${project?.name ?? ''} ${l.name} ${c.name}`)}-${1000 + n}`,
            title, type, bhk, bathrooms: type === 'PLOT' ? 0 : Math.max(1, bhk - (rnd() < 0.4 ? 1 : 0)), priceInr, areaSqft, floor, totalFloors, facing, furnishing, status,
            possession: project?.possession ?? (status === 'UNDER_CONSTRUCTION' ? new Date(Date.UTC(2027, between(0, 11), 1)) : null),
            amenities: project ? project.amenities : type === 'PLOT' ? ['Gated layout', 'Water connection', 'Street lighting'] : some(AMENITIES, 4),
            listedBy: (project ? pick(['BUILDER', 'AGENT', 'OWNER']) : pick(['OWNER', 'AGENT'])) as ListedBy,
            postedAt: new Date(Date.UTC(2026, 10, 18) - between(0, 45) * 86400000),
            localityId: locality.id, projectId: project?.id ?? null,
            description: type === 'PLOT'
              ? `${facing}-facing residential plot of ${areaSqft} sq ft in ${l.name}, ${c.name}. Clear title, ready for construction. ${l.highlights[0]}.`
              : `${facing}-facing ${bhk} BHK ${TYPE_LABEL[type].toLowerCase()} of ${areaSqft} sq ft${floor ? ` on floor ${floor} of ${totalFloors}` : ''} in ${project ? `${project.name}, ` : ''}${l.name}, ${c.name}. ${furnishing ? `${furnishing}. ` : ''}${status === 'READY_TO_MOVE' ? 'Ready to move in.' : 'Under construction.'} ${l.highlights[0]}.`,
          },
        });
      }
    }
  }
  console.log(`Seeded ${CITIES.length} cities, ${CITIES.reduce((s, c) => s + c.localities.length, 0)} localities, ${usedProjects.size} projects, ${n} properties.`);
}

main().finally(() => prisma.$disconnect());

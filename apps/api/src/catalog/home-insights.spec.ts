import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emi, gstOn, homeInsights, homeScorecards, totalCost, vsArea, type Home } from './home-insights';

const NOW = new Date('2026-11-19T00:00:00Z');
const base: Home = {
  slug: 'a', title: 'Alpha flat', price: 10_000_000, area: 1250, bhk: 3, ready: true, possession: null, furnishing: null, amenities: ['Lift'],
  level: 2, levelLabel: 'Good confidence', locality: { slug: 'x', name: 'X Road' }, city: 'City', areaRate: 8000, areaHomes: 5,
  costs: { stampDutyPct: 7, registrationPct: 1, registrationCapInr: 50_000 },
};
const make = (o: Partial<Home>): Home => ({ ...base, ...o });
const beta = (o: Partial<Home> = {}) => make({ slug: 'b', title: 'Beta flat', ...o });
const find = (hs: Home[], key: string) => homeInsights(hs, NOW).find((i) => i.key === key);

test('the sums: EMI, GST, full cost and distance from the area average', () => {
  assert.equal(emi(10_000_000), 70697);
  assert.equal(gstOn(base), 0); assert.equal(gstOn(make({ ready: false })), 500_000); assert.equal(gstOn(make({ ready: false, price: 4_000_000 })), 40_000);
  assert.equal(totalCost(base), 10_000_000 + 700_000 + 50_000);
  assert.equal(totalCost(make({ costs: null })), null);
  assert.equal(vsArea(base), 0); assert.equal(vsArea(make({ areaHomes: 2 })), null);
});

test('identical homes produce no invented differences', () => {
  assert.deepEqual(homeInsights([base, beta()], NOW).map((i) => i.key), []);
});

test('value, outlay and space are each said with the figure', () => {
  const b = beta({ price: 12_500_000, area: 1400 });
  assert.match(find([base, b], 'value')!.text, /₹8,000 a sq ft, 10% less than Beta flat at ₹8,929/);
  const out = find([base, b], 'outlay')!; assert.match(out.title, /Alpha flat costs ₹25 L less/); assert.match(out.text, /about ₹17,674 less every month/); assert.match(out.text, /₹5 L less to put down/);
  assert.match(find([base, b], 'space')!.title, /Beta flat is 150 sq ft bigger/);
});

test('ready against under construction names the date and the GST', () => {
  const r = find([base, beta({ ready: false, possession: '2028-03-31T00:00:00Z' })], 'ready')!;
  assert.match(r.title, /Alpha flat can be moved into now/); assert.match(r.text, /Beta flat is promised for Mar 2028/); assert.match(r.text, /₹5 L on Beta flat/);
});

test('an unverified listing is the first thing said, and a home far above its area is flagged', () => {
  const out = homeInsights([base, beta({ level: 0, levelLabel: 'Not yet verified', price: 12_000_000 })], NOW);
  assert.equal(out[0].key, 'unverified'); assert.equal(out[0].tone, 'warn');
  const above = out.find((i) => i.key === 'above-b')!; assert.equal(above.tone, 'warn'); assert.match(above.title, /asks 20% above its area/);
});

test('different areas, sizes, amenities and furnishing are noted only when they differ', () => {
  const b = beta({ bhk: 2, locality: { slug: 'y', name: 'Y Nagar' }, amenities: ['Lift', 'Pool'], furnishing: 'Semi-furnished' });
  const keys = homeInsights([base, b], NOW).map((i) => i.key);
  for (const k of ['place', 'sizes', 'amenities', 'furnishing']) assert.ok(keys.includes(k), k);
  assert.match(find([base, b], 'amenities')!.text, /Beta flat: Pool/);
});

test('scorecards tag the best value and mark the checks', () => {
  const [a, b] = homeScorecards([base, beta({ price: 12_500_000, area: 1400, ready: false, possession: '2028-03-31T00:00:00Z', level: 0, levelLabel: 'Not yet verified' })], NOW);
  assert.equal(a.tag.text, 'Best value per sq ft'); assert.equal(b.tag.text, 'Not yet verified');
  assert.equal(a.checks[1].text, '₹8,000, the area average'); assert.equal(a.checks[2].text, '₹1.07 Cr with duty');
  assert.equal(b.checks[3].text, 'Mar 2028, in 1 year 4 months'); assert.equal(b.checks[4].tone, 'warn');
});

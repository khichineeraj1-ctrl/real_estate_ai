import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaScorecard, km, localityInsights, type Area } from './locality-insights';

const base: Area = { slug: 'a', name: 'Alpha', city: 'City', homes: 0, avgRate: null, minPrice: null, maxPrice: null, sizes: [], projects: { total: 6, current: 3, ended: 3, lapsed: 0 }, builders: 4, withAgents: 0, highlights: ['Near the metro'], lat: 28.4, lng: 77.0 };
const make = (over: Partial<Area>): Area => ({ ...base, ...over });
const beta = (over: Partial<Area> = {}) => make({ slug: 'b', name: 'Beta', lat: 28.5, lng: 77.1, ...over });
const find = (a: Area, b: Area, key: string) => localityInsights(a, b).find((i) => i.key === key);

test('distance is in km', () => {
  assert.equal(km({ lat: 28.4, lng: 77.0 }, { lat: 28.4, lng: 77.0 }), 0);
  const d = km({ lat: 28.4, lng: 77.0 }, { lat: 28.5, lng: 77.1 }); assert.ok(d > 14 && d < 16, String(d));
});

test('price is compared only from listed homes, and never guessed', () => {
  assert.match(find(make({}), beta(), 'price')!.title, /No prices for either/);
  const one = find(make({ homes: 3, avgRate: 9000, minPrice: 8_000_000 }), beta(), 'price')!;
  assert.match(one.title, /Only Alpha has prices/); assert.match(one.text, /we will not guess/);
  const two = find(make({ homes: 3, avgRate: 9000, minPrice: 8_000_000 }), beta({ homes: 2, avgRate: 12000, minPrice: 15_000_000 }), 'price')!;
  assert.equal(two.tone, 'good'); assert.match(two.title, /Alpha is 25% cheaper/); assert.match(two.text, /about ₹45 L less/);
});

test('says where more is being built, which market is bigger and which is more settled, only when they differ', () => {
  const k = localityInsights(make({}), beta()).map((i) => i.key);
  assert.ok(!k.includes('building')); assert.ok(!k.includes('finished')); assert.ok(!k.includes('size')); assert.ok(!k.includes('lapsed'));
  assert.match(find(make({}), beta({ projects: { total: 9, current: 7, ended: 2, lapsed: 0 } }), 'building')!.title, /More is being built in Beta/);
  // A much bigger area is called bigger once, not also "more being built" and "more settled" on raw counts.
  const busy = beta({ projects: { total: 20, current: 8, ended: 10, lapsed: 2 }, builders: 9 });
  const keys = localityInsights(make({}), busy).map((i) => i.key);
  assert.ok(keys.includes('size')); assert.ok(!keys.includes('building')); assert.ok(!keys.includes('finished'));
  assert.match(find(make({}), busy, 'size')!.text, /20 registered projects by 9 builders, 8 of them still being built, against 6 by 4 builders/);
  const old = beta({ projects: { total: 10, current: 2, ended: 8, lapsed: 0 } });
  assert.match(find(make({}), old, 'finished')!.text, /80% of its projects .* against 50% in Alpha/);
  const warn = find(make({}), busy, 'lapsed')!; assert.equal(warn.tone, 'warn'); assert.match(warn.title, /2 of 20 projects in Beta are marked lapsed/);
  const two = find(make({ projects: { total: 6, current: 2, ended: 2, lapsed: 2 } }), busy, 'lapsed')!;
  assert.match(two.title, /in both/); assert.match(two.text, /2 of 6 in Alpha and 2 of 20 in Beta/);
});

test('sizes and agents are mentioned only where they differ', () => {
  const a = make({ homes: 2, avgRate: 9000, minPrice: 1, sizes: [2, 3] }); const b = beta({ homes: 2, avgRate: 9000, minPrice: 1, sizes: [3, 4], withAgents: 2 });
  assert.match(find(a, b, 'sizes')!.text, /2 BHK only in Alpha; 4 BHK only in Beta/);
  assert.match(find(a, b, 'agents')!.title, /Verified agents sell in Beta/);
  assert.equal(find(a, b, 'price')!.title, 'They ask about the same');
});

test('a scorecard tags the cheaper area and marks what is not known', () => {
  const a = make({ homes: 3, avgRate: 9000, minPrice: 8_000_000 }); const b = beta({ homes: 0 });
  const card = areaScorecard(a, beta({ homes: 2, avgRate: 12000, minPrice: 15_000_000 }));
  assert.equal(card.tag.text, 'Lower asking rate'); assert.equal(card.checks[0].text, '₹9,000 a sq ft'); assert.equal(card.checks[4].text, 'None');
  const bare = areaScorecard(b, a);
  assert.deepEqual(bare.checks.slice(0, 2).map((c) => c.tone), ['none', 'none']);
});

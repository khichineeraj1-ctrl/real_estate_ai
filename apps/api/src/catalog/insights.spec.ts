import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareInsights, registeredOn, registeredYear, scorecard, span, standingOf, type Facts } from './insights';

const NOW = new Date('2026-11-19T00:00:00Z');
const base: Facts = {
  slug: 'a', name: 'Alpha', builder: { slug: 'bb', name: 'BB' }, locality: { slug: 'x', name: 'X Road' }, city: { slug: 'c', name: 'City' },
  registerStatus: 'Registered', registerValidUntil: '2030-03-31T00:00:00Z', reraId: 'GGM/1/2024/1 DATED 18.03.2024',
  track: { total: 5, current: 3, ended: 2, lapsed: 0 }, homes: 0, minPrice: null, maxPrice: null, localityRate: null, highlights: ['Near the metro'], agents: 0,
};
const make = (over: Partial<Facts>): Facts => ({ ...base, ...over });
const keys = (ps: Facts[]) => compareInsights(ps, NOW).map((i) => i.key);

test('standing comes from the register status and end date', () => {
  assert.equal(standingOf(base, NOW), 'current');
  assert.equal(standingOf({ registerStatus: 'Lapsed', registerValidUntil: '2030-01-01' }, NOW), 'lapsed');
  assert.equal(standingOf({ registerStatus: 'Registered', registerValidUntil: '2024-04-30' }, NOW), 'ended');
  assert.equal(standingOf({ registerStatus: null, registerValidUntil: null }, NOW), 'unknown');
});

test('reads the registration year and writes spans in words', () => {
  assert.equal(registeredYear('GGM/415/147/2020/31 DATED 09.10.2020'), 2020);
  assert.equal(registeredYear('PRM/KA/RERA/1251/446/PR/171014/000439'), null);
  assert.equal(span(16 * 30.44 * 24 * 3600 * 1000), '1 year 4 months');
  assert.equal(span(1000), 'under a month');
});

test('a lapsed project is the first thing said, and names the one still running', () => {
  const out = compareInsights([make({}), make({ slug: 'b', name: 'Beta', registerStatus: 'Lapsed', registerValidUntil: '2025-03-31T00:00:00Z' })], NOW);
  assert.equal(out[0].key, 'lapsed'); assert.equal(out[0].tone, 'warn'); assert.deepEqual(out[0].slugs, ['b']);
  assert.match(out[0].text, /Alpha has a registration that is still running/);
});

test('says which is due sooner only when the dates are apart', () => {
  const later = make({ slug: 'b', name: 'Beta', registerValidUntil: '2031-07-31T00:00:00Z' });
  const sooner = compareInsights([later, make({})], NOW).find((i) => i.key === 'sooner')!;
  assert.match(sooner.title, /Alpha is due sooner/); assert.match(sooner.text, /1 year 4 months before Beta/);
  assert.ok(!keys([make({}), make({ slug: 'b', name: 'Beta', registerValidUntil: '2030-04-30T00:00:00Z' })]).includes('sooner'));
});

test('same builder and same area are said once, without inventing a difference', () => {
  const k = keys([make({}), make({ slug: 'b', name: 'Beta' })]);
  assert.ok(k.includes('same-builder')); assert.ok(k.includes('place')); assert.ok(!k.includes('established')); assert.ok(!k.includes('sooner'));
});

test('a builder with lapsed projects elsewhere in the city is flagged', () => {
  const other = make({ slug: 'b', name: 'Beta', builder: { slug: 'zz', name: 'ZZ' }, track: { total: 4, current: 1, ended: 1, lapsed: 2 } });
  const flag = compareInsights([make({}), other], NOW).find((i) => i.key === 'record-zz')!;
  assert.equal(flag.tone, 'warn'); assert.match(flag.title, /ZZ: 2 of its 4 other projects in City lapsed/);
});

test('price speaks only from listed homes', () => {
  assert.match(compareInsights([make({}), make({ slug: 'b', name: 'Beta' })], NOW).find((i) => i.key === 'price')!.title, /No prices listed/);
  const one = compareInsights([make({ minPrice: 12_000_000 }), make({ slug: 'b', name: 'Beta' })], NOW).find((i) => i.key === 'price')!;
  assert.match(one.title, /Only Alpha has prices/);
  const two = compareInsights([make({ minPrice: 12_000_000 }), make({ slug: 'b', name: 'Beta', minPrice: 9_500_000 })], NOW).find((i) => i.key === 'price')!;
  assert.match(two.title, /Beta starts lower/); assert.match(two.text, /₹95 L, against ₹1.2 Cr/);
});

test('a scorecard marks what is good, what to check and what is not known', () => {
  const good = scorecard(make({ agents: 2 }), NOW);
  assert.equal(good.tag.text, 'Registration current');
  assert.deepEqual(good.checks.map((c) => c.tone), ['good', 'good', 'good', 'none', 'good']);
  assert.match(good.checks[1].text, /Mar 2030, in 3 years 4 months/);
  const bad = scorecard(make({ registerStatus: 'Lapsed', registerValidUntil: '2025-03-31T00:00:00Z', track: { total: 5, current: 2, ended: 1, lapsed: 2 } }), NOW);
  assert.equal(bad.tag.tone, 'warn'); assert.equal(bad.checks[0].text, 'Marked lapsed'); assert.equal(bad.checks[2].text, '2 of 5 other projects lapsed');
});

test('a lapsed sibling on the page is not counted again against the builder', () => {
  // Alpha and Beta are both BB's; Beta is the lapsed one, so each sees the other in its own record.
  const a = make({ track: { total: 4, current: 2, ended: 1, lapsed: 1 } });
  const b = make({ slug: 'b', name: 'Beta', registerStatus: 'Lapsed', track: { total: 4, current: 3, ended: 1, lapsed: 0 } });
  const same = compareInsights([a, b], NOW).find((i) => i.key === 'same-builder')!;
  assert.match(same.text, /BB has 3 other registered projects in City, none marked lapsed/);
});

test('reads the registration day from a number that carries it', () => {
  assert.equal(registeredOn('GGM/821/553/2024/48 DATED 29.04.2024')?.toISOString().slice(0, 10), '2024-04-29');
  assert.equal(registeredOn('P52100001149'), null); assert.equal(registeredOn('X DATED 31.02.2024'), null); assert.equal(registeredOn(null), null);
});

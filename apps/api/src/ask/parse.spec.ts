import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Gazetteer, comparison, matchPlace, parseQuestion, rupees } from './parse';

const G: Gazetteer = [
  { slug: 'gurgaon', name: 'Gurgaon', localities: [{ slug: 'sector-57', name: 'Sector 57' }, { slug: 'golf-course-road', name: 'Golf Course Road' }] },
  { slug: 'bengaluru', name: 'Bengaluru', localities: [{ slug: 'whitefield', name: 'Whitefield' }] },
  { slug: 'mumbai', name: 'Mumbai', localities: [{ slug: 'andheri-west', name: 'Andheri West' }] },
];

test('size, place and a ceiling budget', () => {
  const p = parseQuestion('3 BHK in Whitefield under 1.5 cr', G);
  assert.equal(p.bhk, 3);
  assert.equal(p.locality?.slug, 'whitefield');
  assert.equal(p.city?.slug, 'bengaluru');
  assert.equal(p.maxPrice, 15_000_000);
  assert.equal(p.minPrice, undefined);
});

test('sector numbers and bedroom counts are not read as money', () => {
  const p = parseQuestion('2 bhk flat sector 57 gurgaon 90 lakh', G);
  assert.deepEqual([p.bhk, p.type, p.locality?.slug, p.maxPrice], [2, 'APARTMENT', 'sector-57', 9_000_000]);
});

test('ranges, with the first number borrowing the unit', () => {
  assert.deepEqual(parseQuestion('villa in gurugram between 80 lakh and 1.2 crore', G).minPrice, 8_000_000);
  const p = parseQuestion('flats in mumbai 1-2 crore', G);
  assert.deepEqual([p.minPrice, p.maxPrice], [10_000_000, 20_000_000]);
});

test('floors, city aliases, status and price questions', () => {
  assert.equal(parseQuestion('homes above 2 cr in bangalore', G).minPrice, 20_000_000);
  assert.equal(parseQuestion('ready to move flats in Bombay', G).status, 'READY_TO_MOVE');
  assert.equal(parseQuestion('what is the average rate in golf course road', G).intent, 'price');
  assert.equal(matchPlace('Andheri West', G).city?.slug, 'mumbai');
  assert.deepEqual(matchPlace('Noida', G), {});
});

test('questions that weigh two localities against each other', () => {
  const c = comparison('Golf Course Road vs Sector 57, which is cheaper?', G);
  assert.deepEqual([c?.city.slug, c?.a.slug, c?.b.slug], ['gurgaon', 'golf-course-road', 'sector-57']);
  assert.equal(comparison('is sector 57 or golf course road better for families', G)?.a.slug, 'sector-57');
  assert.equal(comparison('3 bhk in sector 57 under 2 crore', G), null, 'one place, no comparison');
  assert.equal(comparison('whitefield vs andheri west', G), null, 'different cities are not compared');
});

test('amounts in words', () => {
  assert.equal(rupees(8_500_000), '₹85 lakh');
  assert.equal(rupees(12_500_000), '₹1.25 crore');
});

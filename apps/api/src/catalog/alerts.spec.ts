import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alertEmail, alertLabel, readAlert } from './alerts';

test('an alert is described in words', () => {
  assert.equal(alertLabel({ kind: 'PROJECTS', city: 'gurgaon', locality: 'sector-65', maxPriceInr: null, bhk: null }, { city: 'Gurgaon', locality: 'Sector 65' }), 'New projects on the RERA register in Sector 65, Gurgaon');
  assert.equal(alertLabel({ kind: 'HOMES', city: 'bengaluru', locality: 'whitefield', maxPriceInr: 15_000_000, bhk: 3 }, { city: 'Bengaluru', locality: 'Whitefield' }), 'New 3 BHK homes under ₹1.5 crore in Whitefield, Bengaluru');
  assert.equal(alertLabel({ kind: 'HOMES', city: 'pune', locality: null, maxPriceInr: null, bhk: null }, { city: 'Pune' }), 'New homes in Pune');
});

test('the form is read strictly: a kind and a city are needed, and price and size only count for homes', () => {
  assert.deepEqual(readAlert({ kind: 'HOMES', city: 'pune', locality: 'baner', maxPrice: '9000000', bhk: '2' }), { kind: 'HOMES', city: 'pune', locality: 'baner', maxPriceInr: 9_000_000, bhk: 2 });
  assert.deepEqual(readAlert({ kind: 'PROJECTS', city: 'pune', maxPrice: '9000000', bhk: 2, locality: 'Bad Slug' }), { kind: 'PROJECTS', city: 'pune', locality: null, maxPriceInr: null, bhk: null });
  assert.deepEqual(readAlert({ kind: 'HOMES', city: 'pune', maxPrice: '', bhk: '99' }), { kind: 'HOMES', city: 'pune', locality: null, maxPriceInr: null, bhk: null });
  assert.throws(() => readAlert({ kind: 'EVERYTHING', city: 'pune' })); assert.throws(() => readAlert({ kind: 'HOMES' }));
});

test('the email lists what is new, cuts a long list, and always says how to stop', () => {
  const one = alertEmail('New projects on the RERA register in Sector 65, Gurgaon', [{ name: 'Alpha', url: 'https://x/a', line: 'BB, Sector 65' }], 'https://x/gurgaon/sector-65', 'https://x/unfollow?token=t');
  assert.equal(one.subject, '1 new: projects on the RERA register in Sector 65, Gurgaon');
  assert.match(one.text, /One has appeared/); assert.match(one.text, /• Alpha \(BB, Sector 65\)\n  https:\/\/x\/a/); assert.match(one.text, /To stop this alert: https:\/\/x\/unfollow\?token=t/);
  const many = alertEmail('New homes in Pune', Array.from({ length: 13 }, (_, i) => ({ name: `Home ${i}`, url: `https://x/${i}` })), 'https://x/pune', 'https://x/stop');
  assert.match(many.text, /13 have appeared/); assert.match(many.text, /…and 3 more/); assert.ok(!many.text.includes('Home 10'));
});

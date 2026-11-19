import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sellingWords } from './upcoming';

test('text that prices, offers or books an unregistered project is caught', () => {
  for (const bad of ['Starting ₹1.2 Cr', '3 BHK from 95 lakhs', 'Rs. 8500 per sq ft', 'Book now with a small token', 'Pre-launch price for early buyers', 'Assured returns of 12%', 'Launch offer this month', 'EMI holiday till possession', '2 crore onwards']) {
    assert.ok(sellingWords(bad), bad);
  }
});

test('a plain description of where it is and what is planned passes', () => {
  for (const ok of ['Three towers of 3 and 4 BHK homes on Golf Course Extension Road, next to the metro.', 'Land has been cleared and the site office is up.', 'Early 2027', null, 'Site walk-through, November 2026', 'A low-rise project near the lake, with a clubhouse planned.']) {
    assert.equal(sellingWords(ok), null, String(ok));
  }
});

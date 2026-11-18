import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DealerFacts, PropertyFacts, dealerConfidence, propertyConfidence } from './confidence';

const dealer = (over: Partial<DealerFacts> = {}): DealerFacts => ({
  kind: 'AGENT', approved: true, checkIdentity: true, checkRera: true, checkPhone: true, checkAddress: true,
  complaints: 0, oldLeads: 0, oldLeadsFollowedUp: 0, listings: 0, listingsRejected: 0, ...over,
});
const home = (over: Partial<PropertyFacts> = {}): PropertyFacts => ({
  seller: dealerConfidence(dealer()), staffVerified: true, photos: 4, underConstruction: false, reraOnRecord: false,
  pricePerSqft: 10_000, areaRate: 10_000, areaHomes: 8, ...over,
});

test('what a dealer says counts for nothing until staff have checked it', () => {
  assert.equal(dealerConfidence(dealer({ approved: false })).level, 0);
  assert.equal(dealerConfidence(dealer({ checkIdentity: false })).level, 0, 'approved but identity unchecked');
  assert.equal(dealerConfidence(dealer({ checkRera: false, checkPhone: false, checkAddress: false })).level, 1);
  assert.equal(dealerConfidence(dealer({ checkAddress: false })).level, 2);
  assert.equal(dealerConfidence(dealer()).level, 3);
  assert.equal(dealerConfidence(dealer({ checkPhone: false })).level, 1, 'RERA alone, without a call, is still basic');
});

test('behaviour on the platform can take the top level away', () => {
  assert.equal(dealerConfidence(dealer({ oldLeads: 10, oldLeadsFollowedUp: 3 })).level, 2, 'ignores most enquiries');
  assert.equal(dealerConfidence(dealer({ oldLeads: 10, oldLeadsFollowedUp: 8 })).level, 3);
  assert.equal(dealerConfidence(dealer({ oldLeads: 2, oldLeadsFollowedUp: 0 })).level, 3, 'too few enquiries to judge');
  assert.equal(dealerConfidence(dealer({ listings: 8, listingsRejected: 3 })).level, 2);
  assert.equal(dealerConfidence(dealer({ complaints: 1 })).level, 1, 'an upheld complaint holds a dealer at basic');
  assert.ok(dealerConfidence(dealer({ complaints: 2 })).reasons.some((r) => !r.ok && /2 buyer complaints/.test(r.text)));
});

test('owners are asked for ownership papers, agents for RERA', () => {
  assert.ok(dealerConfidence(dealer({ kind: 'OWNER' })).reasons.some((r) => /Ownership papers seen/.test(r.text)));
  assert.ok(dealerConfidence(dealer({ kind: 'AGENT' })).reasons.some((r) => /RERA registration checked/.test(r.text)));
});

test('a home needs both a trusted seller and its own check for the top level', () => {
  assert.equal(propertyConfidence(home()).level, 3);
  assert.equal(propertyConfidence(home({ staffVerified: false })).level, 2, 'trusted seller, home itself unchecked');
  assert.equal(propertyConfidence(home({ seller: dealerConfidence(dealer({ approved: false })) })).level, 2, 'checked home lifts an unverified seller to good, not high');
  assert.equal(propertyConfidence(home({ seller: dealerConfidence(dealer({ approved: false })), staffVerified: false })).level, 0);
  assert.equal(propertyConfidence(home({ seller: null, staffVerified: false })).level, 1, 'added by our team, not yet checked');
  assert.equal(propertyConfidence(home({ seller: null })).level, 3);
});

test('warning signs cap the level', () => {
  assert.equal(propertyConfidence(home({ photos: 0 })).level, 2);
  assert.equal(propertyConfidence(home({ underConstruction: true, reraOnRecord: false })).level, 1);
  assert.equal(propertyConfidence(home({ underConstruction: true, reraOnRecord: true })).level, 3);
  const cheap = propertyConfidence(home({ staffVerified: false, pricePerSqft: 6_000 }));
  assert.equal(cheap.level, 1);
  assert.ok(cheap.reasons.some((r) => !r.ok && /40% below the area average/.test(r.text)));
  assert.equal(propertyConfidence(home({ pricePerSqft: 6_000 })).level, 3, 'a checked home may simply be a bargain, but the warning still shows');
  assert.equal(propertyConfidence(home({ staffVerified: false, pricePerSqft: 6_000, areaHomes: 2 })).level, 2, 'too few homes nearby to call it an outlier');
  assert.equal(propertyConfidence(home({ staffVerified: false, pricePerSqft: 7_000 })).level, 2, '30% under is within the normal range');
});

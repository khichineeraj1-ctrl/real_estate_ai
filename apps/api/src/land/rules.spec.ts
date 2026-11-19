import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { STATES, areaAlso, areaText, cleanDistrict, landChecks, listingTitle, rate, toSqft } from './rules';

test('fixed units convert; local units never do', () => {
  assert.equal(toSqft(2, 'acre'), 87_120);
  assert.equal(toSqft(8, 'kanal'), 43_560);
  assert.equal(toSqft(5, 'bigha'), null);
  assert.equal(areaAlso(5, 'bigha'), null);
  assert.equal(areaAlso(1, 'hectare'), '2.47 acres');
  assert.equal(areaAlso(200, 'sqyd'), '1,800 sq ft');
  assert.equal(areaAlso(2, 'acre'), null);
  assert.equal(areaText(1, 'acre'), '1 acre');
});

test('rate is per acre for large land, per sq ft for plots and rent, per local unit otherwise', () => {
  assert.equal(rate({ deal: 'SALE', priceInr: 9_000_000, areaValue: 2, areaUnit: 'acre' }), '₹45 L per acre');
  assert.equal(rate({ deal: 'SALE', priceInr: 3_600_000, areaValue: 200, areaUnit: 'sqyd' }), '₹2,000 per sq ft');
  assert.equal(rate({ deal: 'LEASE', priceInr: 250_000, areaValue: 10_000, areaUnit: 'sqft' }), '₹25 per sq ft a month');
  assert.equal(rate({ deal: 'SALE', priceInr: 5_000_000, areaValue: 5, areaUnit: 'bigha' }), '₹10 L per bigha');
  assert.equal(rate({ deal: 'SALE', priceInr: null, areaValue: 5, areaUnit: 'acre' }), null);
});

test('checks fit the kind of land and the deal', () => {
  const keys = (l: Parameters<typeof landChecks>[0]) => landChecks(l).map((c) => c.key);
  assert.ok(keys({ kind: 'FARM', deal: 'SALE', landUse: 'AGRICULTURAL', areaUnit: 'bigha' }).includes('unit'));
  assert.ok(keys({ kind: 'FARM', deal: 'SALE', landUse: null, areaUnit: 'acre' }).includes('who'));
  assert.ok(!keys({ kind: 'INDUSTRIAL', deal: 'SALE', landUse: 'INDUSTRIAL', areaUnit: 'acre' }).includes('use'));
  const lease = keys({ kind: 'BUILT', deal: 'LEASE', landUse: null, areaUnit: 'sqft' });
  assert.ok(lease.includes('building') && !lease.includes('owners') && !lease.includes('who'));
});

test('districts typed differently land on one page', () => {
  assert.deepEqual(cleanDistrict('alwar dist.'), { slug: 'alwar', name: 'Alwar' });
  assert.deepEqual(cleanDistrict('  ALWAR District '), { slug: 'alwar', name: 'Alwar' });
  assert.equal(cleanDistrict('12'), null);
  assert.equal(STATES.length, 36);
});

test('title says size, kind, deal and place', () => {
  assert.equal(listingTitle({ kind: 'FARM', deal: 'SALE', areaValue: 5, areaUnit: 'bigha', place: 'Tijara', district: 'Alwar' }), '5 bigha farm land for sale in Tijara, Alwar');
});

test('questions about land are told apart from questions about homes', async () => {
  const { landIntent } = await import('./rules');
  assert.equal(landIntent('3 BHK in Whitefield'), null);
  assert.equal(landIntent('plots in Gurgaon'), null); // homes in our cities include plots
  assert.equal(landIntent('plots in Rajasthan')?.kind, 'PLOT');
  assert.deepEqual(landIntent('farm land in Rajasthan'), { kind: 'FARM', deal: undefined, state: { slug: 'rajasthan', name: 'Rajasthan' }, weak: false });
  assert.equal(landIntent('warehouse on rent near Pune')?.kind, 'BUILT');
  assert.equal(landIntent('warehouse on rent near Pune')?.deal, 'LEASE');
  assert.equal(landIntent('land for a warehouse in Uttar Pradesh')?.kind, 'INDUSTRIAL');
  assert.equal(landIntent('buy 5 acres of farm land')?.deal, 'SALE');
  assert.equal(landIntent('Godrej 101 Acres'), null);
  assert.equal(landIntent('M3M projects in Gurgaon'), null);
});

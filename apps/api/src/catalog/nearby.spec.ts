import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { amenityGroups, amenityNames } from './amenities';
import { nearby, readLandmarks, readPin } from './nearby';

test('a pasted pin is read, and one outside India or swapped is refused', () => {
  assert.deepEqual(readPin('28.4089, 77.0421'), { lat: 28.4089, lng: 77.0421 });
  assert.deepEqual(readPin(' 12.97 77.59 '), { lat: 12.97, lng: 77.59 });
  assert.equal(readPin('77.0421, 28.4089'), null);
  assert.equal(readPin('51.5, -0.12'), null);
  assert.equal(readPin('Sector 65'), null);
});

test('nearby keeps the closest of each kind, drops far ones, and always shows an airport', () => {
  const from = { lat: 28.40, lng: 77.07 };
  const groups = nearby(from, [
    { kind: 'METRO', name: 'A', lat: 28.41, lng: 77.07 }, { kind: 'METRO', name: 'B', lat: 28.45, lng: 77.07 }, { kind: 'METRO', name: 'C', lat: 28.43, lng: 77.07 }, { kind: 'METRO', name: 'D', lat: 28.47, lng: 77.07 },
    { kind: 'SCHOOL', name: 'Far school', lat: 28.90, lng: 77.07 }, { kind: 'AIRPORT', name: 'Airport', lat: 28.5562, lng: 77.1 },
  ]);
  assert.deepEqual(groups.map((g) => g.kind), ['METRO', 'AIRPORT']);
  assert.deepEqual(groups[0].items.map((i) => i.name), ['A', 'C', 'B']);
  assert.equal(groups[0].items[0].km, 1.1);
  assert.equal(groups[1].items[0].km, 17.6);
});

test('landmark lines are read strictly', () => {
  assert.equal(readLandmarks('metro | Sector 55-56 | 28.4244, 77.1034\nAIRPORT | Delhi airport | 28.5562, 77.1000').rows.length, 2);
  assert.match(readLandmarks('TEMPLE | X | 28.4, 77.1').error ?? '', /must be one of/);
  assert.match(readLandmarks('METRO | X | somewhere').error ?? '', /pin in India/);
});

test('amenities group by the fixed list and keep free text under Other', () => {
  assert.deepEqual(amenityNames(['POOL', 'Sky deck']), ['Swimming pool', 'Sky deck']);
  const g = amenityGroups(['POOL', 'GYM', 'CCTV', 'Sky deck', 'Swimming pool']);
  assert.deepEqual(g.map((x) => [x.group, x.items.length]), [['Sports and fitness', 2], ['Safety', 1], ['Other', 1]]);
});

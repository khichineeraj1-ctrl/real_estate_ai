import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changeNote } from './watch';

const NOW = new Date('2026-11-19T00:00:00Z');
const d = (s: string) => new Date(`${s}T00:00:00Z`);

test('nothing is said when nothing changed', () => {
  assert.equal(changeNote({ status: 'Registered', validUntil: d('2030-03-31') }, { status: 'Registered', validUntil: d('2030-03-31') }, NOW), null);
  assert.equal(changeNote({ status: 'Lapsed', validUntil: null }, { status: 'Lapsed', validUntil: null }, NOW), null);
});

test('a lapse, and a lapse lifted, are each reported', () => {
  assert.match(changeNote({ status: 'Registered', validUntil: d('2026-06-30') }, { status: 'Lapsed', validUntil: d('2026-06-30') }, NOW)!, /now marks its registration as lapsed/);
  assert.match(changeNote({ status: 'Lapsed', validUntil: d('2026-06-30') }, { status: 'Registered', validUntil: d('2028-06-30') }, NOW)!, /no longer marks .* runs to June 2028/);
});

test('an extension says both dates', () => {
  assert.match(changeNote({ status: 'Registered', validUntil: d('2027-03-31') }, { status: 'Registered', validUntil: d('2028-09-30') }, NOW)!, /extended, from March 2027 to September 2028/);
});

test('a first date appearing is reported', () => {
  assert.match(changeNote({ status: 'Registered', validUntil: null }, { status: 'Registered', validUntil: d('2029-01-31') }, NOW)!, /running to January 2029/);
});

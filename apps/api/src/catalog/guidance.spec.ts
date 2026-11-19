import assert from 'node:assert/strict';
import { test } from 'node:test';
import { beforeYouPay, builderRecord, type ProjectFacts, type RegisterRow } from './guidance';

const NOW = new Date('2026-11-19T00:00:00Z');
const row = (name: string, status: string, until: string | null, year = 2022): RegisterRow => ({ name, registerStatus: status, registerValidUntil: until, reraId: `GGM/1/${year}/1 DATED 01.02.${year}` });

test('a clean record says so, with the next project due', () => {
  const r = builderRecord('BB', 'City', [row('A', 'Registered', '2030-01-31', 2024), row('B', 'Registered', '2028-06-30', 2021), row('C', 'Registered', '2024-01-31', 2018)], NOW);
  assert.deepEqual([r.total, r.current, r.ended, r.lapsed], [3, 2, 1, 0]);
  assert.equal(r.verdict.tone, 'good'); assert.equal(r.since, 2018); assert.equal(r.latest, 2024);
  assert.equal(r.nextDue!.name, 'B');
});

test('lapsed registrations are counted and named, and a large share is said plainly', () => {
  const some = builderRecord('BB', 'City', [row('A', 'Registered', '2030-01-31'), row('B', 'Registered', '2029-01-31'), row('C', 'Registered', '2028-01-31'), row('D', 'Registered', '2027-01-31'), row('E', 'Lapsed', '2025-01-31')], NOW);
  assert.equal(some.verdict.tone, 'warn'); assert.match(some.verdict.title, /1 of 5/); assert.match(some.verdict.text, /Most of BB/); assert.deepEqual(some.lapsedNames, ['E']);
  const many = builderRecord('BB', 'City', [row('A', 'Lapsed', null), row('B', 'Lapsed', null), row('C', 'Registered', '2030-01-31')], NOW);
  assert.match(many.verdict.text, /A large share/);
  assert.equal(builderRecord('BB', 'City', [], NOW).verdict.tone, 'none');
});

const facts: ProjectFacts = { name: 'Alpha', builder: 'BB', city: 'City', registerStatus: 'Registered', registerValidUntil: '2030-03-31', reraId: 'R-1', sourceUrl: 'https://rera.example/1', registerName: 'State RERA', othersLapsed: 0, others: 3, priced: false, agents: 0 };
const keys = (o: Partial<ProjectFacts>) => beforeYouPay({ ...facts, ...o }, NOW).map((i) => i.key);

test('the checklist starts from where the registration stands', () => {
  assert.deepEqual(keys({}).slice(0, 2), ['rera', 'date']);
  const lapsed = beforeYouPay({ ...facts, registerStatus: 'Lapsed' }, NOW);
  assert.equal(lapsed[0].key, 'lapsed'); assert.equal(lapsed[0].tone, 'warn'); assert.ok(!lapsed.some((i) => i.key === 'date'));
  const ended = beforeYouPay({ ...facts, registerValidUntil: '2024-04-30' }, NOW);
  assert.equal(ended[0].key, 'oc'); assert.match(ended[0].why, /Apr 2024, 2 years 7 months ago/);
  assert.equal(beforeYouPay({ ...facts, registerValidUntil: null, reraId: null }, NOW)[0].tone, 'warn');
});

test('the builder’s record and verified agents appear only when there is something to say', () => {
  assert.ok(!keys({}).includes('record')); assert.ok(!keys({}).includes('agent'));
  const k = keys({ othersLapsed: 2, agents: 1 });
  assert.equal(k[1], 'record'); assert.ok(k.includes('agent'));
  for (const always of ['carpet', 'costs', 'ten', 'account', 'title', 'loan']) assert.ok(k.includes(always), always);
});

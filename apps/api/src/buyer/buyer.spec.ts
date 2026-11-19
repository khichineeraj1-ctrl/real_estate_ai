import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanEmail, cleanState } from './buyer.service';

test('emails are trimmed and lower-cased, and junk is refused', () => {
  assert.equal(cleanEmail('  Buyer@Example.COM '), 'buyer@example.com');
  for (const bad of ['', 'nope', 'a@b', 'a b@c.com', 42, null]) assert.equal(cleanEmail(bad), null);
});

test('synced state keeps only slugs, short titles and tick keys', () => {
  const s = cleanState({
    ticks: { 'm3m-altitude-sector-65-gurgaon': ['rera', 'rera', 'carpet', '<script>'], 'Bad Slug': ['x'], ok: 'not-a-list' },
    compare: { projects: [{ slug: 'a-b', title: 'A B', image: 'x.webp', extra: 1 }, { slug: 'NOPE', title: 'n' }, 'junk'], homes: 'junk' },
    anythingElse: { secret: 1 },
  });
  assert.deepEqual(s, { ticks: { 'm3m-altitude-sector-65-gurgaon': ['rera', 'carpet'] }, compare: { homes: [], projects: [{ slug: 'a-b', title: 'A B' }] } });
  assert.deepEqual(cleanState(null), { ticks: {}, compare: { homes: [], projects: [] } });
  assert.equal(cleanState({ compare: { projects: Array.from({ length: 9 }, (_, i) => ({ slug: `p-${i}`, title: 'P' })) } }).compare.projects.length, 4);
});

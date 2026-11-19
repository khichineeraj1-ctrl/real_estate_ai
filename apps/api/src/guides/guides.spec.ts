import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDES, guideBySlug, guideCards } from './guides';

test('every guide is complete and its address is clean', () => {
  assert.ok(GUIDES.length >= 6);
  assert.equal(new Set(GUIDES.map((g) => g.slug)).size, GUIDES.length, 'slugs are unique');
  for (const g of GUIDES) {
    assert.match(g.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, g.slug);
    assert.ok(g.title.length <= 70 && g.summary.length <= 170, `${g.slug}: title and summary fit a search result`);
    assert.ok(g.takeaways.length >= 3 && g.sections.length >= 3 && g.faqs.length >= 3, g.slug);
    for (const s of g.sections) assert.ok(s.heading && s.paras.length >= 1, `${g.slug}: ${s.heading}`);
    if (g.tool) { assert.match(g.tool.href, /^\/tools\//); assert.match(g.tool.app, /^\/tools\//); }
  }
});

test('cards carry no body, and a guide is found by its slug', () => {
  assert.deepEqual(Object.keys(guideCards()[0]).sort(), ['icon', 'minutes', 'short', 'slug', 'summary', 'title']);
  assert.equal(guideBySlug('rera-registration-explained')?.icon, '🏛️');
  assert.equal(guideBySlug('nope'), null);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDES, STAGES, guideBySlug, guideCards } from './guides';

test('every guide is complete and its address is clean', () => {
  assert.ok(GUIDES.length >= 6);
  assert.equal(new Set(GUIDES.map((g) => g.slug)).size, GUIDES.length, 'slugs are unique');
  for (const g of GUIDES) {
    assert.match(g.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, g.slug);
    assert.ok(g.title.length <= 70 && g.summary.length <= 170, `${g.slug}: title and summary fit a search result`);
    assert.ok(g.takeaways.length >= 3 && g.sections.length >= 3 && g.faqs.length >= 3, g.slug);
    for (const s of g.sections) assert.ok(s.heading && s.paras.length >= 1, `${g.slug}: ${s.heading}`);
    assert.ok(STAGES.some((x) => x.key === g.stage), `${g.slug}: stage`); assert.match(g.accent, /^#[0-9a-f]{6}$/); assert.ok(g.stats.length >= 2, `${g.slug}: stats`);
    if (g.tool) { assert.match(g.tool.href, /^\/tools\//); assert.match(g.tool.app, /^\/tools\//); }
  }
});

test('cards carry no body, and a guide is found by its slug', () => {
  assert.deepEqual(Object.keys(guideCards()[0]).sort(), ['accent', 'icon', 'minutes', 'short', 'slug', 'stage', 'summary', 'title']);
  assert.equal(guideBySlug('rera-registration-explained')?.icon, '🏛️');
  assert.equal(guideBySlug('nope'), null);
});

test('every stage of the journey has at least one guide', () => {
  for (const st of STAGES) assert.ok(GUIDES.some((g) => g.stage === st.key), st.key);
});

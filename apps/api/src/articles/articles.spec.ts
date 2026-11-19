import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readArticle, readingMinutes } from './articles.service';

const body = 'A plain paragraph about buying a home. '.repeat(12);

test('a piece needs a kind, a title, a summary and enough to read', () => {
  const a = readArticle({ kind: 'BLOG', title: ' Five things to ask on a site visit ', summary: 'What to look at and who to ask.', body: `${body}\r\n\r\n## A heading\r\n- a point` });
  assert.equal(a.title, 'Five things to ask on a site visit'); assert.ok(!a.body.includes('\r')); assert.equal(a.kind, 'BLOG');
  assert.throws(() => readArticle({ kind: 'NEWS', title: 'T', summary: 'S', body }), /Kind/);
  assert.throws(() => readArticle({ kind: 'GUIDE', title: 'T', summary: 'S', body: 'Too short.' }), /too short/);
  assert.throws(() => readArticle({ kind: 'GUIDE', title: '', summary: 'S', body }), /Title is required/);
  assert.throws(() => readArticle({ kind: 'GUIDE', title: 'x'.repeat(91), summary: 'S', body }), /under 90/);
});

test('code is refused; the body is text, not a web page', () => {
  assert.throws(() => readArticle({ kind: 'BLOG', title: 'T', summary: 'S', body: `${body}<script>alert(1)</script>` }), /cannot contain code/);
  assert.throws(() => readArticle({ kind: 'BLOG', title: 'T', summary: 'S', body: `${body}< iframe src=x>` }), /cannot contain code/);
});

test('reading time is counted from the words', () => {
  assert.equal(readingMinutes('word '.repeat(50)), 1); assert.equal(readingMinutes('word '.repeat(610)), 3);
});

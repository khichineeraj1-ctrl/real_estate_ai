import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LeadFacts, bandOf, readIntent, scoreLead } from './score';

const lead = (over: Partial<LeadFacts> = {}): LeadFacts => ({ name: 'Asha Rao', phone: '9812345670', email: null, message: null, timeline: null, budget: null, loan: null, purpose: null, wantsVisit: false, signals: null, earlierHere: 0, lastDay: 0, ...over });

test('a bare enquiry is cold', () => {
  const s = scoreLead(lead());
  assert.equal(s.band, 'COLD');
  assert.equal(s.score, 5);
});

test('a buyer who is ready and has done their homework is hot', () => {
  const s = scoreLead(lead({ timeline: 'NOW', wantsVisit: true, loan: 'APPROVED', budget: '1_2CR', purpose: 'SELF', email: 'a@example.com', message: 'Can I visit this weekend? What is the price of a 3 BHK?', signals: { views: 3, days: 2, seconds: 140, pages: 5, tools: ['emi', 'cost'], compared: 1, asked: 1 } }));
  assert.equal(s.band, 'HOT');
  assert.ok(s.score >= 90, String(s.score));
  assert.equal(s.reasons[0].text, 'Plans to buy within a month', 'the biggest reason is listed first');
});

test('stated intent alone can make a lead warm, and site use alone cannot make it hot', () => {
  assert.equal(scoreLead(lead({ timeline: 'SOON', wantsVisit: true, budget: '50L_1CR' })).band, 'WARM');
  const browsing = scoreLead(lead({ signals: { views: 9, days: 9, seconds: 900, pages: 40, tools: ['emi', 'afford', 'cost'], compared: 5, asked: 5 } }));
  assert.equal(browsing.band, 'WARM');
  assert.ok(browsing.score <= 35, 'what the browser reports is capped at 30 points');
});

test('"just exploring" scores below saying nothing', () => {
  assert.ok(scoreLead(lead({ timeline: 'EXPLORING' })).score < scoreLead(lead()).score);
});

test('made-up details and bulk enquiries are marked down, never below zero', () => {
  const fake = scoreLead(lead({ name: 'test', phone: '9999999999', timeline: 'NOW' }));
  assert.equal(fake.score, 0);
  assert.ok(fake.reasons.some((r) => r.points < 0 && /phone number looks made up/.test(r.text)));
  const bulk = scoreLead(lead({ timeline: 'NOW', wantsVisit: true, lastDay: 12 }));
  assert.equal(bulk.band, 'COLD');
  assert.ok(scoreLead(lead({ earlierHere: 2 })).score > scoreLead(lead()).score, 'asking again about the same project counts for the buyer');
});

test('bands', () => { assert.deepEqual([0, 24, 25, 49, 50, 100].map(bandOf), ['COLD', 'COLD', 'WARM', 'WARM', 'HOT', 'HOT']); });

test('ready within a month, loan approved and asking to visit is hot on those answers alone', () => {
  assert.equal(scoreLead(lead({ timeline: 'NOW', wantsVisit: true, loan: 'APPROVED', email: 'a@example.com' })).band, 'HOT');
  assert.equal(scoreLead(lead({ timeline: 'NOW', wantsVisit: true })).band, 'WARM');
});

test('only expected answers and sensible numbers are read from a request', () => {
  const i = readIntent({ timeline: 'NOW', budget: 'a lot', loan: 'APPROVED', wantsVisit: 'on', signals: JSON.stringify({ views: 9999, days: -3, seconds: 'x', tools: ['emi', 'emi', 'hack'], pages: 2.6, extra: 'ignored' }) });
  assert.deepEqual([i.timeline, i.budget, i.loan, i.wantsVisit], ['NOW', null, 'APPROVED', true]);
  assert.deepEqual(i.signals, { views: 50, days: 0, seconds: 0, pages: 3, compared: 0, asked: 0, tools: ['emi'] });
  assert.equal(readIntent({ signals: '{not json' }).signals, null);
});

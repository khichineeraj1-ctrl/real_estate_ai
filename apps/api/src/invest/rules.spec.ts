import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { promiseWords, readMilestones, readSources } from './rules';

test('text that promises or predicts a gain is caught; plain description is not', () => {
  for (const t of ['Guaranteed appreciation', 'prices will double in 3 years', '20% returns every year', 'a sure-shot bet', '3x in five years', 'risk free', 'Prices are set to rise sharply'])
    assert.ok(promiseWords(t), t);
  for (const t of ['A 5,000 acre greenfield city along the expressway.', 'The authority has approved phase 1; the first runway is planned for 2027.', 'Land is being acquired in 12 villages.', 'The plan sets aside 30% of the area for industry.'])
    assert.equal(promiseWords(t), null, t);
});

test('sources need a name and a web address', () => {
  assert.deepEqual(readSources('Master Plan 2041 | https://example.gov.in/plan.pdf\n\nGazette notice | http://example.gov.in/g').sources.length, 2);
  assert.match(readSources('Master plan').error ?? '', /needs a name and a web address/);
  assert.match(readSources('Plan | not a link').error ?? '', /not a web address/);
  assert.match(readSources('Plan | javascript:alert(1)').error ?? '', /not a web address/);
});

test('milestones are a date and what happens', () => {
  assert.deepEqual(readMilestones('2027 | First runway to open | authority target').milestones, [{ when: '2027', what: 'First runway to open | authority target' }]);
  assert.match(readMilestones('sometime soon').error ?? '', /needs a date/);
});

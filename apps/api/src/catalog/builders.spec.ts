import assert from 'node:assert/strict';
import { test } from 'node:test';
import { builderFor } from './builders';

test('one company written several ways is one builder', () => {
  const slugs = ['Experion Developers Private Limited', 'Experion Developers PVT. LTD.', 'Experion Developers Pvt.Ltd.', 'Experion Developers PVT LTD'].map((n) => builderFor(n).slug);
  assert.deepEqual([...new Set(slugs)], ['experion-developers']);
  assert.equal(builderFor('Experion Developers PVT. LTD.').name, 'Experion Developers');
  assert.equal(builderFor('Agrante Realty Limted').slug, builderFor('Agrante Realty LTD').slug, 'a misspelt "Limited" is still the company form');
});

test('notes in brackets and "M/s" are not part of the name', () => {
  assert.deepEqual(builderFor('Elan Imperial PVT LTD (Formerly Known As Ambience Infrastructure Developers PVT LTD)'), { slug: 'elan', name: 'Elan' });
  assert.equal(builderFor('MRG Group India Private Limited (Formerly Known As Anudhara Solutions Private Limited))').slug, 'mrg-group-india');
  assert.equal(builderFor('Supreme Holdings & Hospitality (India) Limited').slug, 'supreme-holdings-and-hospitality');
  assert.deepEqual(builderFor('M/s. Shreepad Developers'), { slug: 'shreepad-developers', name: 'Shreepad Developers' });
  assert.equal(builderFor('Ms ASHAR VENTURES').slug, 'ashar-ventures');
});

test('the listed large groups are one builder across their companies', () => {
  for (const n of ['DLF Limited', 'DLF Home Developers Limited', 'DLF Homes Panchkula Private Limited']) assert.deepEqual(builderFor(n), { slug: 'dlf', name: 'DLF' });
  assert.equal(builderFor('Godrej Vestamark LLP').slug, 'godrej-properties');
  assert.equal(builderFor('Emaar MGF Land LTD.').slug, 'emaar');
});

test('different companies stay apart, however alike', () => {
  assert.notEqual(builderFor('Aditya Enterprise').slug, builderFor('Aditya Enterprises').slug);
  assert.notEqual(builderFor('Suncity Housing').slug, builderFor('Suncity Projects PVT LTD').slug);
  assert.notEqual(builderFor('Supreme Mega Constructions LLP').slug, builderFor('Supreme Holdings & Hospitality (India) Limited').slug);
  assert.equal(builderFor('Vijay Associates (Wadhwa)').slug, 'vijay-associates');
  assert.equal(builderFor('Limited').slug, 'limited', 'a name that is only a company form is kept as it is');
});

test('names a person confirmed as one builder', () => {
  assert.equal(builderFor('Perfect Buidwell PVT LTD').slug, builderFor('Perfect Buildwell Private Limited').slug, 'a misspelling');
  assert.equal(builderFor('Puri Construction PVT. LTD.').slug, builderFor('Puri Constructions LTD.').slug);
  assert.deepEqual(builderFor('Macrotech Developers Limited'), { slug: 'lodha-developers', name: 'Lodha' });
  assert.deepEqual(builderFor('Lodha Developers Limited'), { slug: 'lodha-developers', name: 'Lodha' });
  assert.equal(builderFor('MRG Castle Reality LLP').name, 'MRG Group');
  for (const n of ['Athena Infrastructure LTD.', 'Athena Infrastructures LTD.', 'Selene Construction LTD', 'Indiabulls Pharmacare Limited']) assert.deepEqual(builderFor(n), { slug: 'indiabulls', name: 'Indiabulls' });
  assert.equal(builderFor('Countrywide Promoters Private Limited').slug, 'bptp');
  assert.deepEqual(builderFor('City Realty & Development Private Limited'), { slug: 'city-corporation', name: 'City Group' });
});

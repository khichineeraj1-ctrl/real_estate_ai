import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { dayFirst, displayName, parseHaryana, parseKarnataka, parseMaharashtra, projectName, text, haryanaFormUrl, parseHaryanaForm } from './parse';
import { Spot, km, place } from './place';

// Small excerpts of the registers' real pages, saved on 18 Nov 2026.
const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', `${name}.html`), 'utf8');

test('Haryana: the Gurugram table', () => {
  const rows = parseHaryana(fixture('haryana'));
  assert.equal(rows.length, 3);
  const a = rows[0];
  assert.deepEqual([a.regNo, a.name, a.promoter, a.locationText, a.district], ['GGM/415/147/2020/31 DATED 09.10.2020', '102 EDEN ESTATE', 'COUNTRYWIDE PROMOTERS PRIVATE LIMITED', 'SECTOR 102 & 102 A GURUGRAM', 'GURUGRAM']);
  assert.equal(a.validUntil?.toISOString().slice(0, 10), '2024-04-30');
  assert.match(a.sourceUrl, /^https:\/\/haryanarera\.gov\.in\//);
  assert.deepEqual([rows[1].registerStatus, rows[1].regNo], ['Lapsed', 'GGM/486/218/2021/54 DATED 21.09.2021'], 'the lapsed note is a status, not part of the number');
});

test('Karnataka: a district result table, using the extended completion date', () => {
  const rows = parseKarnataka(fixture('karnataka'));
  assert.equal(rows.length, 3);
  const a = rows[0];
  assert.deepEqual([a.regNo, a.name, a.promoter, a.district, a.locationText, a.registerStatus], ['PRM/KA/RERA/1251/446/PR/171010/000003', 'Godrej United', 'United Oxygen Company Private Limited', 'Bengaluru Urban', 'Bengaluru East', 'APPROVED']);
  assert.equal(a.validUntil?.toISOString().slice(0, 10), '2022-02-28');
});

test('Maharashtra: result cards with map positions', () => {
  const { total, entries } = parseMaharashtra(fixture('maharashtra'));
  assert.ok(total && total > 0);
  assert.equal(entries.length, 2);
  for (const e of entries) {
    assert.match(e.regNo, /^P\d{11}$/);
    assert.ok(e.name && e.promoter && e.district);
    assert.match(e.sourceUrl, /^https:\/\/maharerait\.maharashtra\.gov\.in\/public\/project\/view\/\d+$/);
    assert.ok(e.lat! > 15 && e.lat! < 23 && e.lng! > 72 && e.lng! < 81, 'position is inside Maharashtra');
  }
});

test('nothing is read from a page that is not a register list', () => {
  assert.deepEqual(parseHaryana('<html><body>Service unavailable</body></html>'), []);
  assert.deepEqual(parseKarnataka('<table><tr><td>a</td><td>b</td></tr></table>'), []);
  assert.deepEqual(parseMaharashtra('<p>No results</p>'), { total: null, entries: [] });
});

test('text hidden in a comment is not read as content', () => {
  assert.equal(text('GGM/632/364/2022/107 DATED 21.11.2022 <!-- <img src="images/project_completed.jpg" > -->'), 'GGM/632/364/2022/107 DATED 21.11.2022');
});

test('dates and display names', () => {
  assert.equal(dayFirst('31/02/2024'), null, 'not a real date');
  assert.equal(dayFirst('n/a'), null);
  assert.equal(displayName('COUNTRYWIDE PROMOTERS PRIVATE LIMITED'), 'Countrywide Promoters Private Limited');
  assert.equal(displayName('DLF HOME DEVELOPERS LIMITED'), 'DLF Home Developers Limited', 'initials stay as registered');
  assert.equal(displayName('M3M WOODSHIRE'), 'M3M Woodshire');
  assert.equal(displayName('THE LEAF BY SS GROUP'), 'The Leaf by SS Group');
  assert.equal(displayName('Godrej Air'), 'Godrej Air', 'mixed case is left exactly as registered');
});

const SPOTS: Spot[] = [
  { id: '1', slug: 'sector-57', name: 'Sector 57', citySlug: 'gurgaon', lat: 28.4229, lng: 77.0773 },
  { id: '2', slug: 'golf-course-road', name: 'Golf Course Road', citySlug: 'gurgaon', lat: 28.4412, lng: 77.1005 },
  { id: '3', slug: 'dwarka-expressway', name: 'Dwarka Expressway', citySlug: 'gurgaon', lat: 28.4985, lng: 76.993 },
  { id: '4', slug: 'whitefield', name: 'Whitefield', citySlug: 'bengaluru', lat: 12.9698, lng: 77.75 },
  { id: '5', slug: 'powai', name: 'Powai', citySlug: 'mumbai', lat: 19.1176, lng: 72.906 },
  { id: '6', slug: 'baner', name: 'Baner', citySlug: 'pune', lat: 18.559, lng: 73.7868 },
];
const entry = (over: object) => ({ source: 'HARYANA' as const, name: 'X', locationText: '', lat: null, lng: null, ...over });

test('placing by the register’s location text', () => {
  assert.equal(place(entry({ locationText: 'SECTOR 57 GURUGRAM' }), SPOTS)?.spot.slug, 'sector-57');
  assert.equal(place(entry({ locationText: 'SECTOR-57, GURUGRAM' }), SPOTS)?.spot.slug, 'sector-57');
  assert.equal(place(entry({ locationText: 'SECTOR 57A GURUGRAM' }), SPOTS), null, 'a different sector');
  assert.equal(place(entry({ locationText: 'SECTOR 157 GURUGRAM' }), SPOTS), null);
  assert.equal(place(entry({ locationText: 'SECTOR 102 & 102 A GURUGRAM' }), SPOTS)?.spot.slug, 'dwarka-expressway', 'sectors along the expressway');
  assert.equal(place(entry({ locationText: 'SECTOR 54 GURUGRAM' }), SPOTS)?.spot.slug, 'golf-course-road');
  assert.equal(place(entry({ locationText: 'SECTOR 54 AND SECTOR 57 GURUGRAM' }), SPOTS), null, 'two of our localities: left for a person');
  assert.equal(place(entry({ locationText: 'VILLAGE NAURANGPUR' }), SPOTS), null);
});

test('placing by name only when the location says nothing, and never across cities', () => {
  assert.equal(place(entry({ source: 'KARNATAKA', name: 'Prestige Whitefield Grand', locationText: 'Bengaluru East' }), SPOTS)?.spot.slug, 'whitefield');
  assert.equal(place(entry({ source: 'KARNATAKA', name: 'Godrej Air', locationText: 'Bengaluru East' }), SPOTS), null);
  assert.equal(place(entry({ source: 'KARNATAKA', name: 'Adarsh Greens', locationText: 'Whitefield' }), SPOTS), null, 'a Karnataka taluk is too large an area to place by');
  assert.equal(place(entry({ source: 'KARNATAKA', name: 'Sector 57 Heights', locationText: 'Bengaluru East' }), SPOTS), null, 'a Gurgaon locality is not offered to a Karnataka entry');
});

test('placing by map position', () => {
  assert.ok(Math.abs(km(19.1176, 72.906, 19.1176, 72.906)) < 0.001);
  assert.equal(place(entry({ source: 'MAHARASHTRA', lat: 19.12, lng: 72.91 }), SPOTS)?.spot.slug, 'powai');
  assert.equal(place(entry({ source: 'MAHARASHTRA', lat: 18.56, lng: 73.79 }), SPOTS)?.spot.slug, 'baner');
  assert.equal(place(entry({ source: 'MAHARASHTRA', lat: 21.0, lng: 79.0 }), SPOTS), null, 'Nagpur is nowhere near');
  assert.equal(place(entry({ source: 'MAHARASHTRA', name: 'Powai Heights', lat: 21.0, lng: 79.0 }), SPOTS), null, 'the map position overrules the name');
  assert.equal(place(entry({ source: 'MAHARASHTRA', lat: 19.12, lng: 72.91, pincode: '400076' }), SPOTS)?.spot.slug, 'powai', 'position and pincode agree');
  assert.equal(place(entry({ source: 'MAHARASHTRA', lat: 19.12, lng: 72.91, pincode: '411045' }), SPOTS), null, 'a Pune pincode with a Mumbai position: one of them is wrong, so it is left for a person');
  assert.equal(place(entry({ source: 'MAHARASHTRA', lat: 19.12, lng: 72.91, pincode: '400999' }), SPOTS)?.spot.slug, 'powai', 'a pincode we know nothing about does not contradict the position');
});

test('project names are made fit to read, and nothing is invented', () => {
  const cases: [string, string][] = [
    ['M3M ROUTE65', 'M3M Route65'], ['M3M CAPITAL PHASE-3', 'M3M Capital Phase 3'], ['M3M Capital Phase -2', 'M3M Capital Phase 2'], ['M3M Mansion PH-2', 'M3M Mansion Phase 2'],
    ['M3M Latitude ( Tower R-01)', 'M3M Latitude (Tower R-01)'], ['Emaar Business District ( Ebd) 65', 'Emaar Business District (EBD) 65'], ['Sobha City- Phase 1,PART 2', 'Sobha City - Phase 1, Part 2'],
    ['Sobha City (PHASE-2, PART-1)', 'Sobha City (Phase 2, Part 1)'], ['Enigma, PHASE-1A', 'Enigma Phase 1A'], ['Platinum TOWER-4', 'Platinum Tower 4'], ['KAVYAM-PHASE-1', 'Kavyam Phase 1'],
    ['Blue Ridge - THE LOFTS', 'Blue Ridge - The Lofts'], ['HCBS Auroville', 'HCBS Auroville'], ['93 Avenue Phase- III', '93 Avenue Phase III'], ['Pluto-B -Suncity Housing Phase- I', 'Pluto-B - Suncity Housing Phase I'], ['Comercial Colony', 'Commercial Colony'], ['Godrej Air', 'Godrej Air'], ['The Dahlias', 'The Dahlias'], ['Kolte-Patil Life Republic', 'Kolte-Patil Life Republic'],
  ];
  for (const [from, to] of cases) assert.equal(projectName(from), to, from);
  assert.equal(projectName('Group Housing Colony', 'Experion Developers'), 'Group Housing Colony by Experion Developers', 'a name that only says the kind of project is given its builder');
  assert.equal(projectName('Commercial Project of Area 0.4875 Acres', 'Vipul'), 'Commercial Project of Area 0.4875 Acres by Vipul');
  assert.equal(projectName('Emerald Estate', 'Emaar'), 'Emerald Estate', 'a real name is left alone');
});

test('reads what the builder declared in a Haryana project form', () => {
  const f = parseHaryanaForm(fixture('haryana-form'));
  assert.equal(f.litigation, false);
  assert.equal(f.apartments, 342); assert.equal(f.towers, 3);
  assert.equal(f.constructionStart?.toISOString().slice(0, 10), '2024-05-01');
  assert.equal(f.plannedCompletion?.toISOString().slice(0, 10), '2031-07-31');
});

test('a form without the answers gives nothing, never a guess', () => {
  assert.deepEqual(parseHaryanaForm('<html><body><p>Under maintenance</p></body></html>'), { litigation: null, apartments: null, towers: null, constructionStart: null, plannedCompletion: null });
  assert.equal(parseHaryanaForm('<td>Whether any litigation is pending against the Project:</td><td>Yes/No</td><td>Yes</td>').litigation, true);
});

test('finds the form address from a project page address', () => {
  assert.equal(haryanaFormUrl('https://haryanarera.gov.in/view_project/searchprojectDetail/2884'), 'https://haryanarera.gov.in/view_project/project_preview_open/2884');
  assert.equal(haryanaFormUrl('https://rera.karnataka.gov.in/viewAllProjects'), null);
});

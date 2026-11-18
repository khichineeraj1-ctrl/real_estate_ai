/**
 * Reads the public project lists of three state RERA registers. Each parser takes the page as text and returns the
 * entries on it, with nothing invented: a field the register does not give is left empty.
 */
export type Source = 'HARYANA' | 'KARNATAKA' | 'MAHARASHTRA';

export interface RegisterEntry {
  source: Source;
  /** The registration number as the register prints it. With `source`, identifies the project. */
  regNo: string;
  name: string;
  promoter: string;
  district: string;
  /** Whatever the register says about where the project is: sector, taluk or area. */
  locationText: string;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  projectType: string | null;
  /** The register's own status wording, e.g. "APPROVED" or "Lapsed". */
  registerStatus: string | null;
  /** The date the registration runs to, which is the builder's declared completion date. */
  validUntil: Date | null;
  /** The register's own page for this project, or the list it came from. */
  sourceUrl: string;
}

export const SOURCE_NAME: Record<Source, string> = { HARYANA: 'Haryana RERA (Gurugram)', KARNATAKA: 'Karnataka RERA', MAHARASHTRA: 'MahaRERA' };
export const LIST_URL = {
  HARYANA: 'https://haryanarera.gov.in/admincontrol/registered_projects/2',
  KARNATAKA: 'https://rera.karnataka.gov.in/projectViewDetails',
  MAHARASHTRA: 'https://www.maharera.maharashtra.gov.in/projects-search-result',
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m));
/** The visible text of a piece of markup. */
export const text = (markup: string) => decode(markup.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const cells = (row: string) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
const rows = (page: string) => [...page.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => cells(m[1]));

/** A date written day first, as these registers do: 30/04/2024 or 31-05-2021. Null when it is not a real date. */
export function dayFirst(s: string): Date | null {
  const m = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/.exec(s);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d && y > 2000 && y < 2100 ? date : null;
}

/** Haryana, Gurugram authority: one table of every registered project. */
export function parseHaryana(page: string): RegisterEntry[] {
  const out: RegisterEntry[] = [];
  for (const c of rows(page)) {
    if (c.length < 10) continue;
    const certificate = text(c[1]);
    const name = text(c[3]);
    if (!certificate || !name || !/\d/.test(certificate)) continue;
    const lapsed = /lapsed/i.test(certificate);
    const detail = /href="(https:\/\/haryanarera\.gov\.in\/[^"]+)"/i.exec(c[2])?.[1];
    out.push({
      source: 'HARYANA', regNo: certificate.replace(/\s*lapsed project\s*/i, '').trim(), name, promoter: text(c[4]), district: text(c[6]), locationText: text(c[5]),
      pincode: null, lat: null, lng: null, projectType: null, registerStatus: lapsed ? 'Lapsed' : 'Registered', validUntil: dayFirst(text(c[9])), sourceUrl: detail ?? LIST_URL.HARYANA,
    });
  }
  return out;
}

/** Karnataka: the result table for one district. It gives the taluk but not the locality. */
export function parseKarnataka(page: string): RegisterEntry[] {
  const out: RegisterEntry[] = [];
  for (const c of rows(page)) {
    if (c.length < 13) continue;
    const regNo = text(c[2]);
    const name = text(c[5]);
    if (!/^PRM\/KA\/RERA\//i.test(regNo) || !name) continue;
    // "31-05-2021 - 28-02-2022" is the original date followed by the extended one; the last date is the current one.
    const dates = [...text(c[13] ?? '').matchAll(/\d{1,2}-\d{1,2}-\d{4}/g)].map((m) => m[0]);
    out.push({
      source: 'KARNATAKA', regNo, name, promoter: text(c[4]), district: text(c[7]), locationText: text(c[8]), pincode: null, lat: null, lng: null,
      projectType: text(c[9]) || null, registerStatus: text(c[6]) || null, validUntil: dayFirst(dates.at(-1) ?? text(c[12])), sourceUrl: 'https://rera.karnataka.gov.in/viewAllProjects',
    });
  }
  return out;
}

/** Maharashtra: one page of search results (ten projects), each with its map position. Also returns the total the page reports. */
export function parseMaharashtra(page: string): { total: number | null; entries: RegisterEntry[] } {
  const total = /Showing Final <span[^>]*>(\d+)<\/span>/i.exec(page)?.[1];
  const entries: RegisterEntry[] = [];
  for (const block of page.split('<div class="row shadow p-3 mb-5 bg-body rounded">').slice(1)) {
    const regNo = /#\s*(P\d{11})/.exec(block)?.[1];
    const name = /<h4 class="title4"><strong>([\s\S]*?)<\/strong>/i.exec(block)?.[1];
    if (!regNo || !name) continue;
    const field = (label: string) => { const m = new RegExp(`<div class="greyColor">${label}</div>\\s*<p>([\\s\\S]*?)</p>`, 'i').exec(block); return m ? text(m[1]) : ''; };
    const where = /maps\/search\/\?api=1&(?:amp;)?query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(block);
    const lat = where ? Number(where[1]) : null;
    const lng = where ? Number(where[2]) : null;
    // A position is only kept if it is plausibly inside India; a few register entries carry 0,0 or swapped values.
    const placed = lat != null && lng != null && lat > 6 && lat < 37 && lng > 68 && lng < 98;
    const pincode = field('Pincode');
    entries.push({
      source: 'MAHARASHTRA', regNo, name: text(name), promoter: text(/<p class="darkBlue bold\s*">([\s\S]*?)<\/p>/i.exec(block)?.[1] ?? ''), district: field('District'),
      locationText: text(/fa-location-dot"><\/em>([\s\S]*?)<\/a>/i.exec(block)?.[1] ?? ''), pincode: /^\d{6}$/.test(pincode) ? pincode : null,
      lat: placed ? lat : null, lng: placed ? lng : null, projectType: null, registerStatus: 'Registered', validUntil: null,
      sourceUrl: /href="(https:\/\/maharerait\.maharashtra\.gov\.in\/public\/project\/view\/\d+)"/i.exec(block)?.[1] ?? LIST_URL.MAHARASHTRA,
    });
  }
  return { total: total ? Number(total) : null, entries };
}

const SMALL = new Set(['and', 'of', 'the', 'by', 'at', 'in', 'on', 'for']);
/**
 * Registers print most names in capitals. This sets them in ordinary case for display without changing a letter:
 * short all-consonant words and anything with a digit are taken to be initials or codes and left as they are.
 */
export function displayName(s: string): string {
  if (s !== s.toUpperCase()) return s.trim(); // already in mixed case: leave it exactly as registered
  return s.trim().split(/\s+/).map((w, i) => {
    const bare = w.replace(/[^A-Za-z0-9]/g, '');
    if (/\d/.test(bare) || (bare.length <= 4 && !/[AEIOUY]/i.test(bare)) || /^(LLP|II|III|IV|VI|VII|VIII|IX)$/.test(bare)) return w;
    const lower = w.toLowerCase();
    if (i > 0 && SMALL.has(lower)) return lower;
    return lower.replace(/(^|[-&.(/'])([a-z])/g, (_, p: string, ch: string) => p + ch.toUpperCase());
  }).join(' ');
}

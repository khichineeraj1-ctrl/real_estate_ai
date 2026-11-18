import type { PrismaClient } from '@prisma/client';

/**
 * Works out which builder page a promoter's registered name belongs to.
 *
 * Registers list the legal entity, and write it many ways: "Experion Developers Private Limited",
 * "Experion Developers PVT. LTD." and "Experion Developers Pvt.Ltd." are one company. Dropping the company form
 * ("Private Limited", "LLP") and notes in brackets makes those the same builder. Different companies are otherwise
 * kept apart, however alike their names look, except for the few large groups listed in GROUPS. Anything else that
 * should be one builder is merged by a person in the admin panel.
 */

/** Large groups that register projects under many companies, all starting with the group's name. */
const GROUPS: Record<string, string> = {
  dlf: 'DLF', godrej: 'Godrej Properties', sobha: 'Sobha', emaar: 'Emaar', elan: 'Elan', vatika: 'Vatika', adani: 'Adani Realty', kalpataru: 'Kalpataru',
};

/**
 * Names that a person has confirmed are one builder: a second spelling of the same company, or another company of
 * the same group. Left: the address the name would otherwise get. Right: the builder it belongs to.
 */
const SAME: Record<string, string> = {
  'athena-infrastructures': 'indiabulls', 'millenium-diplomats': 'millennium-diplomats', 'perfect-buidwell': 'perfect-buildwell',
  'puri-construction': 'puri-constructions', 'vikas-park': 'vikas-parks', 'pareena-infrastructure': 'pareena-infrastructures',
  'gatevida-developers': 'sector-113-gatevida-developers',
  'hcbs-promoters-and-developers': 'hcbs-developments', 'mrg-castle-reality': 'mrg-group-india', 'pareena-builders-and-promoters': 'pareena-infrastructures',
  'macrotech-developers': 'lodha-developers', // Macrotech Developers is the company behind the Lodha name
  // Indiabulls registers each project under a separate company
  'athena-infrastructure': 'indiabulls', 'selene-construction': 'indiabulls', 'citra-properties': 'indiabulls', 'juventus-estate': 'indiabulls',
  'varali-properties': 'indiabulls', 'sepset-properties': 'indiabulls', 'indiabulls-pharmacare': 'indiabulls',
  'countrywide-promoters': 'bptp', // a BPTP company
  'city-realty-and-development': 'city-corporation', // both City Group, the developer of Amanora
};
/** The name buyers know a builder by, where it differs from the registered one. */
const KNOWN_AS: Record<string, string> = { 'sector-113-gatevida-developers': 'Sector 113 Gatevida Developers', 'mrg-group-india': 'MRG Group', 'pareena-infrastructures': 'Pareena', 'lodha-developers': 'Lodha', indiabulls: 'Indiabulls', 'city-corporation': 'City Group',
  // registered names with odd capitals or a slip of the hand, set right for display; the address is unchanged
  'anil-thakurdas-kursija': 'Anil Thakurdas Kursija', 'ashar-ventures': 'Ashar Ventures', 'namo-developers': 'Namo Developers', 'sanskruti-life-spaces': 'Sanskruti Life Spaces',
  'siddhesh-properties': 'Siddhesh Properties', mhada: 'MHADA', 'pmay-cell-pune-municipal-corporation': 'PMAY Cell, Pune Municipal Corporation',
  'aipl-bharat-infrastructure': 'AIPL Bharat Infrastructure', 'rof-housing-and-infrastructure': 'ROF Housing & Infrastructure', 'messrs-src-and-associates': 'SRC and Associates',
  'deluris-buildtech-india-pvt-lts': 'Deluris Buildtech India', 'sadan-realtechprivate': 'Sadan Realtech', 'reliance-enetrprise': 'Reliance Enterprise',
  'vardhman-propertise': 'Vardhman Properties', 'ocus-skycrapers-realty': 'Ocus Skyscrapers Realty',
};
export const DISPLAY_NAMES = KNOWN_AS;

const FORM = /^(private|pvt|limited|limted|ltd|llp|inc)$/i;

export const slugify = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function builderFor(registered: string): { slug: string; name: string } {
  const plain = registered
    .replace(/\((?:[^()]|\([^()]*\))*\)\)*/g, ' ') // notes in brackets: "(Formerly Known As …)", "(India)"
    .replace(/^\s*m\s*\/?\s*s\.?\s+/i, '') // "M/s", "Ms" in front of a firm's name
    .replace(/([a-z])\.(?=[a-z])/gi, '$1. ') // "Pvt.Ltd." → "Pvt. Ltd."
    .trim();
  const words = plain.split(/[\s,]+/).filter(Boolean);
  while (words.length > 1 && FORM.test(words[words.length - 1].replace(/\./g, ''))) words.pop();
  const name = words.join(' ').replace(/[.,\s]+$/, '') || registered.trim();
  const group = GROUPS[slugify(words[0] ?? '')];
  if (group) return { slug: slugify(group), name: group };
  const own = slugify(name) || 'builder';
  const slug = SAME[own] ?? own;
  return { slug, name: KNOWN_AS[slug] ?? name };
}

/** Words that already mean something right after the city in an address. */
export const RESERVED = ['compare'];
/** What a builder's address becomes when a locality (or a reserved word) already has it. */
export const aside = (slug: string) => `${slug}-builder`;

/**
 * A builder's page in a city is /<city>/<builder>, the same place localities live (/<city>/<locality>). So a builder
 * never takes an address that a locality has: it gets "-builder" added instead.
 */
async function freeAddress(db: Pick<PrismaClient, 'locality'>, slug: string): Promise<string> {
  const taken = RESERVED.includes(slug) || !!(await db.locality.findFirst({ where: { slug }, select: { id: true } }));
  return taken ? aside(slug) : slug;
}

/** The builder page for a registered name, made if this is the first project under it. A merged builder points straight at its target, never at another merged one. */
export async function ensureBuilder(db: Pick<PrismaClient, 'builder' | 'locality'>, registered: string): Promise<string> {
  const found = builderFor(registered);
  const { name } = found;
  const slug = await freeAddress(db, found.slug);
  const row = await db.builder.upsert({ where: { slug }, update: {}, create: { slug, name }, select: { id: true, mergedIntoId: true } });
  return row.mergedIntoId ?? row.id; // a company a person merged into another builder stays merged
}

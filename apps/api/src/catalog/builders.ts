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
  return { slug: slugify(name) || 'builder', name };
}

/** The builder page for a registered name, made if this is the first project under it. A merged builder points straight at its target, never at another merged one. */
export async function ensureBuilder(db: Pick<PrismaClient, 'builder'>, registered: string): Promise<string> {
  const { slug, name } = builderFor(registered);
  const row = await db.builder.upsert({ where: { slug }, update: {}, create: { slug, name }, select: { id: true, mergedIntoId: true } });
  return row.mergedIntoId ?? row.id; // a company a person merged into another builder stays merged
}

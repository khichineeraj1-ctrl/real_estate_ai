/** Gives every project that has no builder page one, from its registered builder name. Safe to run again. */
import { PrismaClient } from '@prisma/client';
import { ensureBuilder } from '../src/catalog/builders';

const db = new PrismaClient();
(async () => {
  const projects = await db.project.findMany({ where: { brandId: null }, select: { id: true, builder: true } });
  for (const p of projects) await db.project.update({ where: { id: p.id }, data: { brandId: await ensureBuilder(db, p.builder) } });
  console.log(`${projects.length} projects linked; ${await db.builder.count()} builder pages in all.`);
})().finally(() => db.$disconnect());

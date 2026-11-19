/** Makes every photo's small version again from its full-size file, so cards show the whole picture. Safe to run again. */
import { PrismaClient } from '@prisma/client';
import { remakeCard } from '../src/admin/photos';

const db = new PrismaClient();
(async () => {
  const photos = await db.photo.findMany({ select: { file: true } });
  let done = 0;
  for (const p of photos) if (await remakeCard(p.file)) done++;
  console.log(`${done} of ${photos.length} small versions remade.`);
})().finally(() => db.$disconnect());

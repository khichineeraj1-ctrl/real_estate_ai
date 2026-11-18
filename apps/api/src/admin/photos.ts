import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Where listing photos live. Local disk for now: the API serves this folder at /uploads and the site shows it at /media.
 * To move to object storage, replace savePhoto/removePhoto here and the static route in main.ts.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_LISTING = 12;

/** The real type from the file's first bytes; the name and the browser's claimed type are not trusted. */
export function sniffImage(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

export async function savePhoto(data: Buffer, ext: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const file = `${randomUUID()}.${ext}`; // a name we chose, so nothing from the upload reaches the file system
  await writeFile(join(UPLOAD_DIR, file), data);
  return file;
}

/** Deletes one stored photo. Only names in the shape savePhoto creates are accepted. */
export async function removePhoto(file: string): Promise<void> {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(file)) return;
  await unlink(join(UPLOAD_DIR, file)).catch(() => undefined);
}

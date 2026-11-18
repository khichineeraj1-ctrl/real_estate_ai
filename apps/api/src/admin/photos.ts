import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * Where listing photos live. Local disk for now: the API serves this folder at /uploads and the site shows it at /media.
 * To move to object storage, replace savePhoto/removePhoto here and the static route in main.ts.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_LISTING = 12;
const FULL_PX = 1600; // longest side of the photo shown on the property page
const CARD_PX = 640; // width of the small version used on listing cards
const MAX_PIXELS = 50_000_000; // refuse images that would take excessive memory to decode

/** The real type from the file's first bytes; the name and the browser's claimed type are not trusted. */
export function sniffImage(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/** The small version's file name: "<id>.webp" becomes "<id>-card.webp". */
export const cardFile = (file: string) => file.replace(/\.webp$/, '-card.webp');

export interface ProcessedPhoto { full: Buffer; card: Buffer; width: number; height: number }

/**
 * Re-encodes an upload into two WebP files: a full size (at most 1600px) and a card size (640px wide).
 * Re-encoding also turns the photo the right way up and drops embedded data such as the camera's GPS position.
 * Throws if the bytes are not a readable image.
 */
export async function processPhoto(data: Buffer): Promise<ProcessedPhoto> {
  const base = () => sharp(data, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).rotate();
  const full = await base().resize({ width: FULL_PX, height: FULL_PX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const card = await base().resize({ width: CARD_PX, height: Math.round(CARD_PX * 0.75), fit: 'cover', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  return { full: full.data, card, width: full.info.width, height: full.info.height };
}

export async function savePhoto(p: ProcessedPhoto): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const file = `${randomUUID()}.webp`; // a name we chose, so nothing from the upload reaches the file system
  await writeFile(join(UPLOAD_DIR, file), p.full);
  await writeFile(join(UPLOAD_DIR, cardFile(file)), p.card);
  return file;
}

/** Deletes both sizes of one stored photo. Only names in the shape savePhoto creates are accepted. */
export async function removePhoto(file: string): Promise<void> {
  if (!/^[0-9a-f-]{36}\.webp$/.test(file)) return;
  await Promise.all([file, cardFile(file)].map((f) => unlink(join(UPLOAD_DIR, f)).catch(() => undefined)));
}

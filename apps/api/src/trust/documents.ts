import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Verification documents (RERA certificates, identity and ownership proof). These are personal and sensitive, so they
 * are kept in their own folder that no web address points at. The only way to read one is through the API, which sends
 * it to the dealer it belongs to or to staff, and to nobody else. Files are not encrypted on disk: protect this folder
 * (or move it to private object storage) in production.
 */
export const DOCUMENT_DIR = process.env.DOCUMENT_DIR || join(process.cwd(), 'private-documents');
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENTS = 8;
/** Days after a review before a dealer's documents are deleted. The verification result is kept; the papers are not. */
export const RETENTION_DAYS = Math.max(1, Number(process.env.DOCUMENT_RETENTION_DAYS ?? 90) || 90);

const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' } as const;

/** The real type from the file's first bytes. PDFs, JPEGs and PNGs only. */
export function sniffDocument(b: Buffer): keyof typeof TYPES | null {
  if (b.length > 4 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  return null;
}

const SAFE = /^[0-9a-f-]{36}\.(pdf|jpg|png)$/;

export async function saveDocument(data: Buffer, ext: keyof typeof TYPES): Promise<{ file: string; mime: string }> {
  await mkdir(DOCUMENT_DIR, { recursive: true, mode: 0o700 });
  const file = `${randomUUID()}.${ext}`;
  await writeFile(join(DOCUMENT_DIR, file), data, { mode: 0o600 }); // readable by the API's own account only
  return { file, mime: TYPES[ext] };
}

export async function readDocument(file: string): Promise<Buffer | null> {
  if (!SAFE.test(file)) return null;
  return readFile(join(DOCUMENT_DIR, file)).catch(() => null);
}

export async function deleteDocument(file: string): Promise<void> {
  if (!SAFE.test(file)) return;
  await unlink(join(DOCUMENT_DIR, file)).catch(() => undefined);
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IMPORT_COLUMNS, IMPORT_SAMPLE, parseCsv } from './csv';
import sharp from 'sharp';
import { cardFile, processPhoto, sniffImage } from './photos';

test('quoted cells, embedded commas, quotes and line breaks', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, y","say ""hi"""\n"two\nlines",z\n\n'), [['a', 'b'], ['x, y', 'say "hi"'], ['two\nlines', 'z']]);
  assert.deepEqual(parseCsv('﻿a,b\n1,'), [['a', 'b'], ['1', '']]);
});

test('the sample file matches the documented columns', () => {
  const rows = parseCsv(IMPORT_SAMPLE);
  assert.deepEqual(rows[0], [...IMPORT_COLUMNS]);
  assert.ok(rows.slice(1).every((r) => r.length === IMPORT_COLUMNS.length));
});

test('image type comes from the bytes, not the name', () => {
  assert.equal(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'jpg');
  assert.equal(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])), 'png');
  assert.equal(sniffImage(Buffer.from('RIFF0000WEBPVP8 ', 'latin1')), 'webp');
  assert.equal(sniffImage(Buffer.from('<svg onload=alert(1)>')), null);
  assert.equal(sniffImage(Buffer.from('plain text, not an image')), null);
});

test('photos are re-encoded to two WebP sizes, and unreadable files are refused', async () => {
  const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#6080c8' } }).jpeg().toBuffer();
  const p = await processPhoto(big);
  assert.deepEqual([p.width, p.height], [1600, 1067]);
  assert.equal(sniffImage(p.full), 'webp');
  const card = await sharp(p.card).metadata();
  assert.deepEqual([card.width, card.height, card.format], [640, 427, 'webp'], 'the small version keeps the whole picture in its own shape; it is not cropped');
  assert.equal(cardFile('abc.webp'), 'abc-card.webp');
  // Starts like a JPEG, so it passes the first check, but is not one.
  await assert.rejects(processPhoto(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('not really an image')])));
});

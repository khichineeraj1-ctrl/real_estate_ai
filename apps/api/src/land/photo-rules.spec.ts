import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import sharp from 'sharp';
import { lightProblem, sizeProblem, wrongKind } from './photo-rules';

test('small and strip-shaped photos are refused with the size in the reason', () => {
  assert.equal(sizeProblem(1600, 1200), null);
  assert.equal(sizeProblem(600, 800), null); // upright is fine
  assert.match(sizeProblem(640, 480) ?? '', /too small \(640 × 480 pixels\).*at least 800 × 600/);
  assert.match(sizeProblem(900, 500) ?? '', /too small/);
  assert.match(sizeProblem(4000, 900) ?? '', /too long and thin/);
});

test('files that are not photos get a reason that names what they are', () => {
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(8)]);
  assert.match(wrongKind(heic), /iPhone HEIC/);
  assert.match(wrongKind(Buffer.from('%PDF-1.7 ...........')), /PDF/);
  assert.match(wrongKind(Buffer.from('hello world, not an image')), /not a photo we can read/);
});

test('dark and blank photos are refused; an ordinary one is not', async () => {
  const flat = (r: number, g: number, b: number) => sharp({ create: { width: 200, height: 150, channels: 3, background: { r, g, b } } }).png().toBuffer();
  assert.match((await lightProblem(await flat(120, 160, 90))) ?? '', /blank/);
  const noise = (level: number) => { const raw = Buffer.alloc(200 * 150 * 3); for (let i = 0; i < raw.length; i++) raw[i] = Math.min(255, Math.floor(((i * 7919) % 97) * level)); return sharp(raw, { raw: { width: 200, height: 150, channels: 3 } }).png().toBuffer(); };
  assert.match((await lightProblem(await noise(0.3))) ?? '', /too dark/);
  assert.equal(await lightProblem(await noise(2.4)), null);
});

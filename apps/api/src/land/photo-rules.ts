import sharp from 'sharp';

/**
 * What a listing photo must be before it is stored, and the words the poster is shown when one is not. Each reason
 * says what is wrong and what to do about it, because the person reading it may never have uploaded a photo before.
 */
export const MIN_LONG = 800;
export const MIN_SHORT = 600;
export const MAX_SHAPE = 3; // longest side over shortest: beyond this it is a panorama or a strip
export const PHOTO_TIPS = [
  `At least ${MIN_LONG} × ${MIN_SHORT} pixels: send the original from your camera or gallery, not one forwarded on WhatsApp.`,
  'Taken in daylight, showing the land or building itself: from the road, the boundary, and anything on it.',
  'No screenshots, maps, brochures, or pictures with phone numbers or other websites’ marks on them.',
  'The first photo is the one buyers see on the card, so start with your best.',
];

/** A file that is not a picture we can show, told apart by its first bytes so the reason can be specific. */
export function wrongKind(b: Buffer): string {
  const brand = b.length > 12 && b.subarray(4, 8).toString('latin1') === 'ftyp' ? b.subarray(8, 12).toString('latin1') : '';
  if (/^(heic|heix|hevc|mif1|msf1|heim|heis)$/.test(brand)) return 'This is an iPhone HEIC photo, which browsers cannot show. On the iPhone, open Settings → Camera → Formats and choose “Most Compatible”, or email the photo to yourself (that turns it into a JPEG), then add it again.';
  if (brand) return 'This is a video or a moving photo, not a still picture. Add a still photo in JPEG or PNG.';
  if (b.subarray(0, 4).toString('latin1') === '%PDF') return 'This is a PDF, not a photo. Take a picture of the land itself and add that.';
  if (b.subarray(0, 3).toString('latin1') === 'GIF') return 'This is a GIF. Add a still photo in JPEG or PNG.';
  return 'This file is not a photo we can read. Add a JPEG or PNG picture from your camera or gallery.';
}

/** Too small, or too long and thin, to look right on the listing. Null when the size is fine. */
export function sizeProblem(width: number, height: number): string | null {
  const long = Math.max(width, height); const short = Math.min(width, height);
  if (long < MIN_LONG || short < MIN_SHORT) return `This photo is too small (${width} × ${height} pixels) and would look blurred on the listing. It needs to be at least ${MIN_LONG} × ${MIN_SHORT}. Send the original from your camera or gallery: photos forwarded on WhatsApp, and screenshots of photos, are made much smaller.`;
  if (long / short > MAX_SHAPE) return `This photo is too long and thin (${width} × ${height} pixels), like a panorama, and most of it would be cut off. Add an ordinary photo instead.`;
  return null;
}

/** Almost black, or one flat colour: an accidental shot, a photo taken at night, or a blank image. */
export async function lightProblem(image: Buffer): Promise<string | null> {
  const { channels } = await sharp(image).removeAlpha().stats();
  const mean = channels.reduce((a, c) => a + c.mean, 0) / channels.length;
  const spread = Math.max(...channels.map((c) => c.stdev));
  if (mean < 28) return 'This photo is too dark to make anything out. Take it again in daylight and add that one.';
  if (spread < 6) return 'This photo is blank or a single flat colour, so there is nothing in it for a buyer to see. Add a photo of the land or building.';
  return null;
}

/** The picture's own size, the right way up, before anything is made smaller: what the poster would recognise. */
export async function trueSize(image: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const m = await sharp(image).metadata();
    if (!m.width || !m.height) return null;
    return (m.orientation ?? 1) >= 5 ? { width: m.height, height: m.width } : { width: m.width, height: m.height };
  } catch { return null; }
}

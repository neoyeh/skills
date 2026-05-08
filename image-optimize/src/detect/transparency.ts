import sharp from 'sharp';
import type { TransparencyState } from '../types.js';

export interface TransparencyAnalysis {
  state: TransparencyState;
  /** Ratio of pixels with alpha < 255, in [0, 1]. */
  transparentRatio: number;
  hasAlphaChannel: boolean;
}

/**
 * Decide whether an image actually uses transparency.
 *
 * Cheap path: if `hasAlpha` is false → opaque.
 * If alpha channel exists but its minimum value is 255 → opaque (channel unused).
 * Otherwise: count pixels with alpha < 255 to compute the ratio.
 *
 * Pixels are counted on the raw decoded buffer, so cost scales with width × height.
 * For typical web-bound images (≤ 4K) this is fine.
 */
export async function analyzeTransparency(
  buffer: Buffer,
  threshold: number,
): Promise<TransparencyAnalysis> {
  const img = sharp(buffer);
  const meta = await img.metadata();

  if (!meta.hasAlpha) {
    return { state: 'opaque', transparentRatio: 0, hasAlphaChannel: false };
  }

  // Quick "is the alpha channel actually used" check.
  const stats = await sharp(buffer).stats();
  const alphaChannel = stats.channels[stats.channels.length - 1];
  if (alphaChannel && alphaChannel.min === 255) {
    return { state: 'opaque', transparentRatio: 0, hasAlphaChannel: true };
  }

  // Walk the raw alpha plane to compute the ratio.
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  const channels = info.channels;
  let transparent = 0;
  for (let i = channels - 1; i < data.length; i += channels) {
    if ((data[i] ?? 255) < 255) transparent++;
  }
  const ratio = total === 0 ? 0 : transparent / total;

  let state: TransparencyState;
  if (ratio === 0) state = 'opaque';
  else if (ratio < threshold) state = 'almost-opaque';
  else state = 'transparent';

  return { state, transparentRatio: ratio, hasAlphaChannel: true };
}

/** Returns true when `state` should be safe to flatten / convert to JPG. */
export function isFlattenable(state: TransparencyState): boolean {
  return state === 'opaque' || state === 'almost-opaque';
}

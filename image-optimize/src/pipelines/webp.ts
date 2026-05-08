import sharp from 'sharp';
import type { Pipeline } from './types.js';
import { effectiveQuality } from '../routing/quality.js';

export const webpPipeline: Pipeline = async (input, config) => {
  const transformedBy: string[] = [];
  const warnings: string[] = [];

  const quality = effectiveQuality(config.quality, 'webp', config.webp.quality);
  const animated = input.pages > 1;

  // For animated input, we must re-decode with `animated: true`.
  let pipeline = animated ? sharp(input.buffer, { animated: true }) : sharp(input.buffer);

  pipeline = pipeline.webp({
    quality,
    lossless: config.webp.lossless,
    effort: config.webp.effort,
    alphaQuality: config.webp.alphaQuality,
  });

  transformedBy.push(
    `webp:${config.webp.lossless ? 'lossless' : `q${quality}`}${animated ? ':animated' : ''}`,
  );

  if (!config.stripExif) {
    pipeline = pipeline.withMetadata();
    transformedBy.push('keep-exif');
  }

  const buffer = await pipeline.toBuffer();
  return { buffer, transformedBy, warnings };
};

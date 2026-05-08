import sharp from 'sharp';
import type { Pipeline } from './types.js';
import { effectiveQuality } from '../routing/quality.js';

export const avifPipeline: Pipeline = async (input, config) => {
  const transformedBy: string[] = [];
  const warnings: string[] = [];

  if (input.pages > 1) {
    warnings.push(
      'Animated AVIF support is limited; flattening to static first frame.',
    );
  }

  const quality = effectiveQuality(config.quality, 'avif', config.avif.quality);

  let pipeline = sharp(input.buffer).avif({
    quality,
    effort: config.avif.effort,
    chromaSubsampling: config.avif.chromaSubsampling,
  });

  transformedBy.push(`avif:q${quality}:effort${config.avif.effort}`);

  if (!config.stripExif) {
    pipeline = pipeline.withMetadata();
    transformedBy.push('keep-exif');
  }

  const buffer = await pipeline.toBuffer();
  return { buffer, transformedBy, warnings };
};

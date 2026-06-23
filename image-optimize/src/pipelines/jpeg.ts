import sharp from 'sharp';
import type { Pipeline } from './types.js';
import { effectiveQuality } from '../routing/quality.js';

export const jpegPipeline: Pipeline = async (input, config) => {
  const transformedBy: string[] = [];
  const warnings: string[] = [];

  let pipeline = sharp(input.buffer);

  // JPG cannot carry alpha; composite onto background if needed.
  if (input.hasAlpha) {
    const bg = input.flattenWith ?? '#ffffff';
    pipeline = pipeline.flatten({ background: bg });
    transformedBy.push(`flatten:${bg}`);
    // Surface this: transparency is being baked onto a solid colour, which can
    // produce an unexpected fringe/box on cut-outs. Don't let it happen silently.
    warnings.push(`flattened transparency onto ${bg}`);
  }

  const quality = effectiveQuality(config.quality, 'jpg', config.jpg.quality);

  pipeline = pipeline.jpeg({
    quality,
    mozjpeg: config.jpg.mozjpeg,
    progressive: config.jpg.progressive,
    chromaSubsampling: config.jpg.chromaSubsampling,
  });
  transformedBy.push(`jpeg:q${quality}${config.jpg.mozjpeg ? ':mozjpeg' : ''}`);

  if (!config.stripExif) {
    pipeline = pipeline.withMetadata();
    transformedBy.push('keep-exif');
  }

  const buffer = await pipeline.toBuffer();
  return { buffer, transformedBy, warnings };
};

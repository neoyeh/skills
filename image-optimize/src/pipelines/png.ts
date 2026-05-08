import sharp from 'sharp';
import type { Pipeline } from './types.js';
import { effectiveQuality } from '../routing/quality.js';

export const pngPipeline: Pipeline = async (input, config) => {
  const transformedBy: string[] = [];
  const warnings: string[] = [];

  const quality = effectiveQuality(config.quality, 'png', config.png.quality);

  const pngOpts: sharp.PngOptions = {
    compressionLevel: config.png.compressionLevel,
    effort: config.png.effort,
  };

  if (config.png.quantize) {
    // libvips palette mode = libimagequant quantization → indexed PNG.
    pngOpts.palette = true;
    pngOpts.quality = quality;
    transformedBy.push(`png:quantize:q${quality}`);
  } else {
    transformedBy.push(`png:lossless:level${config.png.compressionLevel}`);
  }

  let pipeline = sharp(input.buffer).png(pngOpts);

  if (!config.stripExif) {
    pipeline = pipeline.withMetadata();
    transformedBy.push('keep-exif');
  }

  const buffer = await pipeline.toBuffer();
  return { buffer, transformedBy, warnings };
};

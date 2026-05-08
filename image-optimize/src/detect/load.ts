import sharp from 'sharp';
import { detectFormat } from './format.js';
import type { ImageFormat } from '../types.js';

export interface LoadedImage {
  /** Buffer suitable for downstream processing (HEIC may be re-decoded to PNG). */
  buffer: Buffer;
  /** Original format as detected from the source buffer. */
  format: ImageFormat;
  width: number;
  height: number;
  /** 1 for static, >1 for animated frames. */
  pages: number;
  hasAlpha: boolean;
  decodedVia: 'sharp' | 'heic-convert';
}

/**
 * Read magic bytes, detect format, and probe metadata.
 * Falls back to `heic-convert` when sharp/libvips can't decode HEIC on this platform.
 */
export async function loadImage(
  buffer: Buffer,
  hintPath?: string,
): Promise<LoadedImage> {
  const format = await detectFormat(buffer, hintPath);
  if (!format) {
    throw new Error('Unsupported or unrecognised image format');
  }

  // SVG bypasses sharp — it's text/XML.
  if (format === 'svg') {
    return {
      buffer,
      format,
      width: 0,
      height: 0,
      pages: 1,
      hasAlpha: true,
      decodedVia: 'sharp',
    };
  }

  let workingBuffer = buffer;
  let decodedVia: 'sharp' | 'heic-convert' = 'sharp';

  if (format === 'heic') {
    // Eagerly decode HEIC to PNG bytes. Two purposes:
    //   1. Tests whether Sharp can actually decode (not just identify the container).
    //      libheif on many platforms reads the container fine but lacks the HEVC
    //      decoder plugin — that error only surfaces when we call .toBuffer().
    //   2. Hands downstream pipelines a buffer they can process without re-decoding
    //      HEIC (which would just hit the same plugin error).
    try {
      workingBuffer = await sharp(buffer).png().toBuffer();
    } catch {
      const heicConvert = (await import('heic-convert')).default;
      const decoded = await heicConvert({
        buffer: buffer as unknown as ArrayBuffer,
        format: 'PNG',
      });
      workingBuffer = Buffer.from(decoded);
      decodedVia = 'heic-convert';
    }
  }

  const meta = await sharp(workingBuffer, { animated: true }).metadata();

  return {
    buffer: workingBuffer,
    format,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    pages: meta.pages ?? 1,
    hasAlpha: meta.hasAlpha ?? false,
    decodedVia,
  };
}

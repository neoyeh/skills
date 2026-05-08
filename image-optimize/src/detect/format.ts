import { fileTypeFromBuffer } from 'file-type';
import path from 'node:path';
import type { ImageFormat } from '../types.js';

/**
 * Detect the *real* image format from buffer magic bytes.
 * Falls back to extension only if the buffer isn't recognised
 * (relevant for SVG, which is text-based).
 */
export async function detectFormat(
  buffer: Buffer,
  hintPath?: string,
): Promise<ImageFormat | null> {
  const ft = await fileTypeFromBuffer(buffer);
  if (ft) {
    const mapped = mapMime(ft.ext);
    if (mapped) return mapped;
    // file-type recognises content but isn't an image format we map directly.
    // For 'xml' specifically, dig deeper — it's almost always SVG when used as an image.
  }

  // SVG is XML / plain text — file-type returns 'xml' for it.
  if (looksLikeSvg(buffer)) {
    return 'svg';
  }

  if (hintPath) {
    return mapExt(path.extname(hintPath).slice(1).toLowerCase());
  }

  return null;
}

function mapMime(ext: string): ImageFormat | null {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'jpg';
    case 'png':
      return 'png';
    case 'webp':
      return 'webp';
    case 'avif':
      return 'avif';
    case 'gif':
      return 'gif';
    case 'tif':
    case 'tiff':
      return 'tiff';
    case 'heic':
    case 'heif':
      return 'heic';
    case 'bmp':
      return 'bmp';
    default:
      return null;
  }
}

function mapExt(ext: string): ImageFormat | null {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'jpg';
    case 'png':
      return 'png';
    case 'webp':
      return 'webp';
    case 'avif':
      return 'avif';
    case 'gif':
      return 'gif';
    case 'svg':
      return 'svg';
    case 'tif':
    case 'tiff':
      return 'tiff';
    case 'heic':
    case 'heif':
      return 'heic';
    case 'bmp':
      return 'bmp';
    default:
      return null;
  }
}

function looksLikeSvg(buf: Buffer): boolean {
  // Sniff first ~512 bytes for "<svg" or "<?xml ... <svg".
  const head = buf.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
}

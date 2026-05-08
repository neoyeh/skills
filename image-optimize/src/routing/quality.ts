import type { QualityLevel, WritableFormat } from '../types.js';

/**
 * Format-specific quality numbers at each abstract level.
 * Calibrated so that one row is roughly visually equivalent across formats —
 * e.g. JPEG 82 ≈ AVIF 60 ≈ WebP 80 in subjective quality (SSIM ~0.96).
 */
const QUALITY_MAP: Record<QualityLevel, Record<WritableFormat, number>> = {
  light: {
    jpg: 92,
    png: 90,
    webp: 90,
    avif: 75,
    gif: 100,
    svg: 100,
  },
  balanced: {
    jpg: 82,
    png: 80,
    webp: 80,
    avif: 60,
    gif: 100,
    svg: 100,
  },
  aggressive: {
    jpg: 72,
    png: 70,
    webp: 70,
    avif: 48,
    gif: 100,
    svg: 100,
  },
  extreme: {
    jpg: 60,
    png: 60,
    webp: 60,
    avif: 35,
    gif: 100,
    svg: 100,
  },
};

export function qualityForFormat(
  level: QualityLevel,
  format: WritableFormat,
): number {
  return QUALITY_MAP[level][format];
}

/** Resolve effective quality: explicit override > level-mapped value. */
export function effectiveQuality(
  level: QualityLevel,
  format: WritableFormat,
  override?: number | undefined,
): number {
  return override ?? qualityForFormat(level, format);
}

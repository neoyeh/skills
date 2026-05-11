/**
 * Public types shared across the skill.
 * Internal modules import from here to avoid circular deps.
 */

export type ProfileName =
  | 'web'        // smart routing, transparency-aware (default)
  | 'preserve'   // strict no-format-conversion
  | 'modern'     // → AVIF/WebP everywhere
  | 'blog'       // photo-first
  | 'graphic'    // UI/icons/logos
  | 'archive';   // visually lossless

export type QualityLevel = 'light' | 'balanced' | 'aggressive' | 'extreme';

export type ImageFormat =
  | 'jpg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'gif'
  | 'svg'
  | 'tiff'
  | 'heic'
  | 'bmp';

export type WritableFormat = 'jpg' | 'png' | 'webp' | 'avif' | 'gif' | 'svg';

export type TransparencyState = 'opaque' | 'almost-opaque' | 'transparent';

export interface ProcessedFile {
  input: string;
  output: string;
  inputBytes: number;
  outputBytes: number;
  savedBytes: number;
  savedRatio: number;
  inputFormat: ImageFormat;
  outputFormat: WritableFormat;
  transformedBy: string[];
  warnings: string[];
}

export interface SkippedFile {
  input: string;
  /**
   * Output path when the file already has a corresponding output (either
   * untouched because up-to-date, or copied as-is when savings were below
   * threshold). Absent for dry-run skips.
   */
  output?: string;
  reason:
    | 'already-smaller-than-threshold'
    | 'already-up-to-date'
    | 'unsupported-format'
    | 'dry-run'
    | 'no-savings';
}

export interface FailedFile {
  input: string;
  message: string;
}

export interface RunSummary {
  totalFiles: number;
  processedCount: number;
  skippedCount: number;
  errorCount: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalSavedBytes: number;
  totalSavedRatio: number;
}

export interface RunReport {
  schema: 'image-optimize/v1';
  configSource: string | null;
  profile: ProfileName;
  qualityLevel: QualityLevel;
  processed: ProcessedFile[];
  skipped: SkippedFile[];
  errors: FailedFile[];
  summary: RunSummary;
}

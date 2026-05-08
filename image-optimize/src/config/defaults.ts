import { parseConfig, type ResolvedConfig, type UserConfig } from './schema.js';
import type { ProfileName } from '../types.js';

/** Built-in defaults (driven by Zod's `.default()` calls in the schema). */
export const BUILTIN_DEFAULTS: ResolvedConfig = parseConfig({});

/**
 * Profile-specific deltas, applied on top of defaults.
 * The `web` profile mostly matches built-in defaults — listed for clarity.
 */
export const PROFILE_OVERRIDES: Record<ProfileName, Partial<UserConfig>> = {
  // Smart routing — transparency-aware, the safe everyday default.
  web: {
    pngRoute: {
      convert: 'auto',
      routing: { opaque: 'jpg', transparent: 'preserve' },
    },
    gifRoute: { animated: 'webp' },
    heicRoute: { convert: 'jpg' },
  },

  // Strict no-format-conversion. JPG→JPG, PNG→PNG, etc. — only compress.
  preserve: {
    pngRoute: {
      convert: 'preserve',
      routing: { opaque: 'preserve', transparent: 'preserve' },
    },
    gifRoute: { animated: 'preserve' },
    heicRoute: { convert: 'jpg' },
  },

  // Maximum compression — everything → WebP/AVIF.
  modern: {
    pngRoute: {
      convert: 'webp',
      routing: { opaque: 'webp', transparent: 'webp' },
    },
    gifRoute: { animated: 'webp' },
    heicRoute: { convert: 'avif' },
  },

  // Photo-first — quality-leaning, smart routing.
  blog: {
    quality: 'balanced',
    pngRoute: {
      convert: 'auto',
      routing: { opaque: 'jpg', transparent: 'preserve' },
    },
    gifRoute: { animated: 'webp' },
    heicRoute: { convert: 'jpg' },
    jpg: { quality: 88 },
  },

  // UI/icons/logos — preserve sharp edges, stay PNG.
  graphic: {
    pngRoute: { convert: 'preserve' },
    gifRoute: { animated: 'webp' },
    png: { quantize: true },
  },

  // Visually lossless — bigger files, but pristine quality.
  archive: {
    quality: 'light',
    pngRoute: { convert: 'preserve' },
    gifRoute: { animated: 'preserve' },
    jpg: { quality: 95 },
    png: { quantize: false },
    webp: { lossless: true },
    stripExif: false, // archive should preserve metadata
  },
};

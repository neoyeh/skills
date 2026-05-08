import path from 'node:path';
import crypto from 'node:crypto';
import type { ResolvedConfig } from '../config/schema.js';
import type { WritableFormat } from '../types.js';

export interface NamingContext {
  /** Absolute path to the input file. */
  inputPath: string;
  /** Base directory used to resolve `{dir}` placeholder. */
  inputBaseDir: string;
  outputFormat: WritableFormat;
  width?: number;
  height?: number;
  contentBuffer?: Buffer;
}

const PLACEHOLDER_RE = /\{(name|ext|dir|w|h|hash|date|format)\}/g;

/** Apply a naming template like `{name}-w{w}.{ext}` to a context. */
export function applyNaming(template: string, ctx: NamingContext): string {
  const parsed = path.parse(ctx.inputPath);
  const relDir = path.relative(ctx.inputBaseDir, parsed.dir);

  return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    switch (key) {
      case 'name':
        return parsed.name;
      case 'ext':
        return ctx.outputFormat === 'jpg' ? 'jpg' : ctx.outputFormat;
      case 'dir':
        return relDir;
      case 'w':
        return ctx.width?.toString() ?? '';
      case 'h':
        return ctx.height?.toString() ?? '';
      case 'hash':
        return ctx.contentBuffer ? hashBuffer(ctx.contentBuffer) : '';
      case 'date':
        return new Date().toISOString().slice(0, 10);
      case 'format':
        return ctx.outputFormat;
      default:
        return '';
    }
  });
}

function hashBuffer(buf: Buffer): string {
  return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
}

type SlugRules = Exclude<ResolvedConfig['output']['slug'], boolean>;

/** Apply slug cleanup rules to a filename's stem (without extension). */
export function applySlug(
  name: string,
  rules: ResolvedConfig['output']['slug'],
): string {
  if (rules === false) return name;
  const r: SlugRules =
    rules === true
      ? {
          lowercase: true,
          replaceSpaces: '-',
          stripSpecial: true,
          stripDiacritics: true,
        }
      : rules;

  let result = name;

  if (r.stripDiacritics) {
    result = result.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  if (r.lowercase) {
    result = result.toLowerCase();
  }
  if (r.replaceSpaces) {
    result = result.replace(/\s+/g, r.replaceSpaces);
  }
  if (r.stripSpecial) {
    // Keep alphanumerics, dot, dash, underscore, and the chosen space-replacement.
    const keep = (r.replaceSpaces ?? '').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp(`[^a-zA-Z0-9_\\-.${keep}]`, 'g');
    result = result.replace(re, '');
  }
  if (r.maxLength != null && r.maxLength > 0) {
    result = result.slice(0, r.maxLength);
  }

  return result;
}

/** Convenience: apply naming template AND slug cleanup to produce a final filename. */
export function buildOutputPath(
  outputDir: string,
  template: string,
  ctx: NamingContext,
  slug: ResolvedConfig['output']['slug'],
  transformName?: ResolvedConfig['output']['transformName'],
  mirrorStructure: boolean = false,
): string {
  const rendered = applyNaming(template, ctx);
  const parsed = path.parse(rendered);

  let stem = parsed.name;
  if (transformName) {
    stem = transformName(stem, {
      width: ctx.width,
      height: ctx.height,
      format: ctx.outputFormat,
    });
  } else {
    stem = applySlug(stem, slug);
  }

  const filename = `${stem}${parsed.ext}`;

  if (mirrorStructure) {
    const inputRelDir = path.relative(
      ctx.inputBaseDir,
      path.dirname(ctx.inputPath),
    );
    return path.join(outputDir, inputRelDir, filename);
  }

  return path.join(outputDir, parsed.dir, filename);
}

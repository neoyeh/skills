import { z } from 'zod';

// ─── primitive sub-schemas ────────────────────────────────────────────────

const SlugRulesSchema = z.object({
  lowercase: z.boolean().default(true),
  replaceSpaces: z.string().default('-'),
  stripSpecial: z.boolean().default(true),
  stripDiacritics: z.boolean().default(true),
  maxLength: z.number().int().positive().optional(),
});

const TransformNameFn = z.function()
  .args(z.string(), z.record(z.unknown()))
  .returns(z.string());

const OutputSchema = z.object({
  dir: z.string().default('./optimized'),
  naming: z.string().default('{name}.{ext}'),
  // Mirror input subdirectory layout into output.
  // ON by default — most users expect `assets/a/b/c.png → out/a/b/c.jpg`.
  // Set false to flatten everything into the output root.
  mirrorStructure: z.boolean().default(true),
  slug: z.union([z.boolean(), SlugRulesSchema]).default(false),
  transformName: TransformNameFn.optional(),
}).default({});

// ─── per-format options ───────────────────────────────────────────────────

const JpgSchema = z.object({
  quality: z.number().int().min(1).max(100).optional(),
  mozjpeg: z.boolean().default(true),
  progressive: z.boolean().default(true),
  chromaSubsampling: z.enum(['4:4:4', '4:2:0']).default('4:2:0'),
}).default({});

const PngSchema = z.object({
  quality: z.number().int().min(1).max(100).optional(),
  quantize: z.boolean().default(true),
  palette: z.boolean().default(true),
  compressionLevel: z.number().int().min(0).max(9).default(9),
  effort: z.number().int().min(1).max(10).default(7),
}).default({});

const WebpSchema = z.object({
  quality: z.number().int().min(1).max(100).optional(),
  lossless: z.boolean().default(false),
  effort: z.number().int().min(0).max(6).default(4),
  alphaQuality: z.number().int().min(0).max(100).default(100),
}).default({});

const AvifSchema = z.object({
  quality: z.number().int().min(1).max(100).optional(),
  effort: z.number().int().min(0).max(9).default(4),
  chromaSubsampling: z.enum(['4:4:4', '4:2:0']).default('4:4:4'),
}).default({});

const GifOutputSchema = z.object({
  optimizationLevel: z.number().int().min(1).max(3).default(3),
  colors: z.number().int().min(2).max(256).default(256),
}).default({});

const SvgSchema = z.object({
  multipass: z.boolean().default(true),
  removeViewBox: z.boolean().default(false),
  removeTitle: z.boolean().default(true),
}).default({});

// ─── routing schemas ──────────────────────────────────────────────────────

const PngRoutingSchema = z.object({
  opaque: z.enum(['jpg', 'webp', 'preserve']).default('jpg'),
  transparent: z.enum(['preserve', 'webp']).default('preserve'),
}).default({});

const PngRouteSchema = z.object({
  convert: z.enum(['auto', 'jpg', 'webp', 'preserve']).default('auto'),
  transparencyThreshold: z.number().min(0).max(1).default(0.01),
  routing: PngRoutingSchema,
  flattenWith: z.string().optional(),
}).default({});

const GifRouteSchema = z.object({
  animated: z.enum(['webp', 'preserve']).default('webp'),
  static: z.enum(['auto', 'jpg', 'png', 'preserve']).default('auto'),
}).default({});

const HeicRouteSchema = z.object({
  convert: z.enum(['jpg', 'webp', 'avif']).default('jpg'),
  fallbackEngine: z.boolean().default(true),
}).default({});

// ─── advanced rules ───────────────────────────────────────────────────────

const RuleSchema = z.object({
  match: z.string(),
  profile: z
    .enum(['web', 'preserve', 'modern', 'blog', 'graphic', 'archive'])
    .optional(),
  quality: z.enum(['light', 'balanced', 'aggressive', 'extreme']).optional(),
  convert: z.string().optional(),
  output: z
    .object({
      naming: z.string().optional(),
      dir: z.string().optional(),
    })
    .optional(),
});

// ─── top-level config ─────────────────────────────────────────────────────

export const ConfigSchema = z.object({
  profile: z
    .enum(['web', 'preserve', 'modern', 'blog', 'graphic', 'archive'])
    .default('web'),

  quality: z
    .enum(['light', 'balanced', 'aggressive', 'extreme'])
    .default('balanced'),

  // Default input when no positional CLI argument is given.
  // CLI args (e.g. `optimize photo.jpg`) always override this.
  input: z.union([z.string(), z.array(z.string())]).optional(),

  output: OutputSchema,

  jpg: JpgSchema,
  png: PngSchema,
  webp: WebpSchema,
  avif: AvifSchema,
  gifOutput: GifOutputSchema,
  svg: SvgSchema,

  pngRoute: PngRouteSchema,
  gifRoute: GifRouteSchema,
  heicRoute: HeicRouteSchema,

  stripExif: z.boolean().default(true),

  // Skip writing output if savings less than this. Accepts "5%" or 0.05 or bytes.
  skipIfSmallerThan: z
    .union([z.string().regex(/^\d+(\.\d+)?%$/), z.number()])
    .default('5%'),

  // Rsync-style idempotency. When ON, skip a file if its output already exists
  // and was last modified at or after the input. Override with --force on CLI.
  skipIfUpToDate: z.boolean().default(false),

  rules: z.array(RuleSchema).optional(),

  concurrency: z.number().int().min(1).max(32).default(4),
}).strict();

// User config: input shape (everything optional, defaults applied later).
export const UserConfigSchema = ConfigSchema.deepPartial();

export type ResolvedConfig = z.infer<typeof ConfigSchema>;
export type UserConfig = z.input<typeof UserConfigSchema>;
export type Rule = z.infer<typeof RuleSchema>;

/** Parse + validate user config, returning a fully-resolved config. */
export function parseConfig(input: unknown): ResolvedConfig {
  // Two-stage parse: validate user shape then re-parse with full defaults.
  const userShape = UserConfigSchema.parse(input);
  return ConfigSchema.parse(userShape);
}

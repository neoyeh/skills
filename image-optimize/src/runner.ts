import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import pLimit from 'p-limit';

import type { ResolvedConfig } from './config/schema.js';
import type {
  ImageFormat,
  RunReport,
  ProcessedFile,
  SkippedFile,
  FailedFile,
} from './types.js';
import { loadImage } from './detect/load.js';
import { analyzeTransparency } from './detect/transparency.js';
import { decideRoute } from './routing/router.js';
import { getPipeline } from './pipelines/index.js';
import { buildOutputPath } from './utils/naming.js';

export interface RunOptions {
  config: ResolvedConfig;
  configSource: string | null;
  inputs: string[];
  outputDir?: string;
  dryRun?: boolean;
}

const SUPPORTED_GLOB =
  '**/*.{jpg,jpeg,png,webp,avif,gif,svg,tif,tiff,heic,heif,bmp}';

/** Expand input paths (files or directories) into a sorted list of files. */
async function expandInputs(inputs: string[]): Promise<{
  files: string[];
  baseDir: string;
}> {
  const expanded = new Set<string>();
  const baseDirs = new Set<string>();

  for (const input of inputs) {
    const abs = path.resolve(input);
    let s;
    try {
      s = await stat(abs);
    } catch {
      throw new Error(`Input path not found: ${input}`);
    }
    if (s.isDirectory()) {
      const found = await globby(SUPPORTED_GLOB, {
        cwd: abs,
        absolute: true,
        caseSensitiveMatch: false,
      });
      found.forEach((f) => expanded.add(f));
      baseDirs.add(abs);
    } else if (s.isFile()) {
      expanded.add(abs);
      baseDirs.add(path.dirname(abs));
    }
  }

  const files = [...expanded].sort();
  // Pick the longest common ancestor as base for {dir} and mirrorStructure.
  const baseDir = commonAncestor([...baseDirs]) ?? process.cwd();
  return { files, baseDir };
}

function commonAncestor(paths: string[]): string | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0] ?? null;
  const split = paths.map((p) => p.split(path.sep));
  const segs: string[] = [];
  const minLen = Math.min(...split.map((s) => s.length));
  for (let i = 0; i < minLen; i++) {
    const seg = split[0]?.[i];
    if (seg !== undefined && split.every((s) => s[i] === seg)) {
      segs.push(seg);
    } else {
      break;
    }
  }
  const out = segs.join(path.sep);
  return out.length > 0 ? out : path.sep;
}

function parseSkipThreshold(
  spec: string | number,
  inputBytes: number,
): number {
  if (typeof spec === 'number') return spec;
  const m = spec.match(/^(\d+(?:\.\d+)?)%$/);
  if (m && m[1]) {
    const pct = parseFloat(m[1]) / 100;
    return Math.floor(inputBytes * pct);
  }
  return 0;
}

export async function run(opts: RunOptions): Promise<RunReport> {
  const { config, configSource, inputs, dryRun = false } = opts;
  const outputDir = path.resolve(opts.outputDir ?? config.output.dir);

  const { files, baseDir } = await expandInputs(inputs);

  if (!dryRun) {
    await mkdir(outputDir, { recursive: true });
  }

  const limit = pLimit(config.concurrency);
  const processed: ProcessedFile[] = [];
  const skipped: SkippedFile[] = [];
  const errors: FailedFile[] = [];

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        try {
          const result = await processOne(file, baseDir, outputDir, config, dryRun);
          if (result.kind === 'processed') processed.push(result.entry);
          else if (result.kind === 'skipped') skipped.push(result.entry);
        } catch (err) {
          errors.push({
            input: relativeOrAbs(file, baseDir),
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    ),
  );

  const totalInputBytes = processed.reduce((s, p) => s + p.inputBytes, 0);
  const totalOutputBytes = processed.reduce((s, p) => s + p.outputBytes, 0);
  const totalSavedBytes = totalInputBytes - totalOutputBytes;
  const totalSavedRatio =
    totalInputBytes === 0 ? 0 : totalSavedBytes / totalInputBytes;

  return {
    schema: 'image-optimize/v1',
    configSource,
    profile: config.profile,
    qualityLevel: config.quality,
    processed,
    skipped,
    errors,
    summary: {
      totalFiles: files.length,
      processedCount: processed.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      totalInputBytes,
      totalOutputBytes,
      totalSavedBytes,
      totalSavedRatio,
    },
  };
}

type OneResult =
  | { kind: 'processed'; entry: ProcessedFile }
  | { kind: 'skipped'; entry: SkippedFile };

async function processOne(
  file: string,
  baseDir: string,
  outputDir: string,
  config: ResolvedConfig,
  dryRun: boolean,
): Promise<OneResult> {
  const inputBuffer = await readFile(file);
  const inputBytes = inputBuffer.length;

  const loaded = await loadImage(inputBuffer, file);

  // Transparency only matters when the input is PNG (router needs it).
  let transparencyState:
    | 'opaque'
    | 'almost-opaque'
    | 'transparent' = loaded.hasAlpha ? 'transparent' : 'opaque';

  if (loaded.format === 'png' && loaded.hasAlpha) {
    const analysis = await analyzeTransparency(
      loaded.buffer,
      config.pngRoute.transparencyThreshold,
    );
    transparencyState = analysis.state;
  }

  const route = decideRoute(
    {
      format: loaded.format,
      pages: loaded.pages,
      hasAlpha: loaded.hasAlpha,
      transparency: transparencyState,
    },
    config,
  );

  const pipeline = getPipeline(route.outputFormat);
  const pipelineResult = await pipeline(
    {
      buffer: loaded.buffer,
      pages: loaded.pages,
      hasAlpha: loaded.hasAlpha,
      width: loaded.width,
      height: loaded.height,
      flattenWith: route.flattenWith,
    },
    config,
  );

  const outputBytes = pipelineResult.buffer.length;
  const savedBytes = inputBytes - outputBytes;
  const savedRatio = inputBytes === 0 ? 0 : savedBytes / inputBytes;

  const outputPath = buildOutputPath(
    outputDir,
    config.output.naming,
    {
      inputPath: file,
      inputBaseDir: baseDir,
      outputFormat: route.outputFormat,
      width: loaded.width,
      height: loaded.height,
      contentBuffer: pipelineResult.buffer,
    },
    config.output.slug,
    config.output.transformName,
    config.output.mirrorStructure,
  );

  // Idempotent skip: if the win is too small, copy the original through so
  // the output directory still contains a usable file at the expected path.
  const minSavings = parseSkipThreshold(config.skipIfSmallerThan, inputBytes);
  if (savedBytes < minSavings && route.outputFormat === loaded.format) {
    if (!dryRun) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, inputBuffer);
    }
    return {
      kind: 'skipped',
      entry: {
        input: relativeOrAbs(file, baseDir),
        output: relativeOrAbs(outputPath, baseDir),
        reason: 'already-smaller-than-threshold',
      },
    };
  }

  if (!dryRun) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, pipelineResult.buffer);
  }

  const transformedBy = [
    `decoded-via:${loaded.decodedVia}`,
    ...route.labels,
    ...pipelineResult.transformedBy,
  ];

  const inputFormat: ImageFormat = loaded.format;

  return {
    kind: 'processed',
    entry: {
      input: relativeOrAbs(file, baseDir),
      output: relativeOrAbs(outputPath, baseDir),
      inputBytes,
      outputBytes,
      savedBytes,
      savedRatio,
      inputFormat,
      outputFormat: route.outputFormat,
      transformedBy,
      warnings: pipelineResult.warnings,
    },
  };
}

function relativeOrAbs(p: string, base: string): string {
  const rel = path.relative(base, p);
  return rel.startsWith('..') ? p : rel;
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { Pipeline } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * GIF output pipeline — only used when the user keeps GIF as the output format
 * (`preserve` profile). Uses bundled gifsicle via the `gifsicle` npm package.
 *
 * gifsicle is a binary that operates on files, so we shuttle through a temp dir.
 */
export const gifPipeline: Pipeline = async (input, config) => {
  let gifsiclePath: string;
  try {
    const mod = await import('gifsicle');
    gifsiclePath = (mod.default ?? (mod as unknown as string)) as string;
  } catch {
    throw new Error(
      "Cannot output GIF: package 'gifsicle' not installed. " +
        'Either install it or pick a profile that re-encodes animated GIFs to WebP (e.g. `web`).',
    );
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), 'imgopt-gif-'));
  const inFile = path.join(tmp, 'in.gif');
  const outFile = path.join(tmp, 'out.gif');

  try {
    await writeFile(inFile, input.buffer);

    const args = [
      `-O${config.gifOutput.optimizationLevel}`,
      '--colors',
      String(config.gifOutput.colors),
      inFile,
      '-o',
      outFile,
    ];

    await execFileAsync(gifsiclePath, args);

    const buffer = await readFile(outFile);

    return {
      buffer,
      transformedBy: [
        `gifsicle:O${config.gifOutput.optimizationLevel}:colors${config.gifOutput.colors}`,
      ],
      warnings: [],
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
};

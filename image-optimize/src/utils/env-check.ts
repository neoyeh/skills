import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export interface EnvStatus {
  sharp: {
    available: boolean;
    libvips: string | undefined;
    inputFormats: string[];
    outputFormats: string[];
    heifSupport: boolean;
  };
  gifsicle: { available: boolean; path: string | null };
  heicConvert: { available: boolean };
  /** Resolved paths — useful for AI agents running in non-login shells. */
  invocation: {
    nodePath: string;
    cliPath: string;
    shimPath: string;
    shimExists: boolean;
  };
}

interface FormatInfo {
  input?: { file?: boolean };
  output?: { file?: boolean };
}

/** Probe runtime dependencies. Used by health-check + diagnostics. */
export async function checkEnv(): Promise<EnvStatus> {
  const formats = sharp.format as unknown as Record<string, FormatInfo>;

  const inputFormats = Object.entries(formats)
    .filter(([, info]) => info?.input?.file)
    .map(([name]) => name);
  const outputFormats = Object.entries(formats)
    .filter(([, info]) => info?.output?.file)
    .map(([name]) => name);

  const heifSupport = inputFormats.includes('heif');

  let gifsiclePath: string | null = null;
  try {
    const mod = (await import('gifsicle')) as { default: string };
    gifsiclePath = mod.default;
  } catch {
    /* not installed */
  }

  let heicConvertAvailable = false;
  try {
    await import('heic-convert');
    heicConvertAvailable = true;
  } catch {
    /* not installed */
  }

  const versions = sharp.versions as unknown as Record<string, string>;

  // Both index.js and cli.js are bundled into the same dist/ directory.
  const cliPath = fileURLToPath(new URL('./cli.js', import.meta.url));
  const shimPath = join(homedir(), '.local', 'bin', 'optimize');

  return {
    sharp: {
      available: true,
      libvips: versions.vips,
      inputFormats,
      outputFormats,
      heifSupport,
    },
    gifsicle: {
      available: typeof gifsiclePath === 'string',
      path: gifsiclePath,
    },
    heicConvert: { available: heicConvertAvailable },
    invocation: {
      nodePath: process.execPath,
      cliPath,
      shimPath,
      shimExists: existsSync(shimPath),
    },
  };
}

/** Print a human-readable env summary. */
export function formatEnvStatus(status: EnvStatus): string {
  const lines: string[] = [];
  lines.push(
    `sharp:        ${status.sharp.available ? '✓' : '✗'} (libvips ${status.sharp.libvips ?? '?'})`,
  );
  lines.push(`  input:      ${status.sharp.inputFormats.join(', ')}`);
  lines.push(`  output:     ${status.sharp.outputFormats.join(', ')}`);
  lines.push(
    `  HEIF:       ${status.sharp.heifSupport ? '✓ via libvips' : '✗ (heic-convert fallback only)'}`,
  );
  lines.push(
    `gifsicle:     ${status.gifsicle.available ? `✓ (${status.gifsicle.path})` : '✗'}`,
  );
  lines.push(`heic-convert: ${status.heicConvert.available ? '✓' : '✗'}`);
  lines.push('');
  lines.push(`node:         ${status.invocation.nodePath}`);
  lines.push(`cli:          ${status.invocation.cliPath}`);
  lines.push(`shim:         ${status.invocation.shimPath} ${status.invocation.shimExists ? '✓' : '✗ (run postinstall)'}`);
  return lines.join('\n');
}

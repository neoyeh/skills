import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(here, '../dist/cli.js');

/** Run the built CLI, resolving with its exit code (never rejects). */
function runCli(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    execFile('node', [CLI, ...args], (err) => {
      resolve(err && typeof (err as { code?: number }).code === 'number' ? (err as { code: number }).code : 0);
    });
  });
}

async function goodPng(file: string) {
  await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 90, g: 140, b: 200 } } })
    .png()
    .toFile(file);
}

describe('CLI exit code reflects failures', () => {
  it('partial failure (some good, some broken) exits non-zero', async () => {
    const src = '/tmp/ec-partial-src';
    const out = '/tmp/ec-partial-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    await goodPng(`${src}/good.png`);
    writeFileSync(`${src}/bad.png`, Buffer.from('not a real png'));

    const code = await runCli([src, '--profile', 'web', '--output', out, '--no-config']);
    expect(code).not.toBe(0); // currently 0 → this assertion fails before the fix
  });

  it('total failure exits non-zero', async () => {
    const src = '/tmp/ec-total-src';
    const out = '/tmp/ec-total-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    writeFileSync(`${src}/bad.png`, Buffer.from('not a real png'));

    const code = await runCli([src, '--profile', 'web', '--output', out, '--no-config']);
    expect(code).not.toBe(0);
  });

  it('all-success exits zero', async () => {
    const src = '/tmp/ec-ok-src';
    const out = '/tmp/ec-ok-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    await goodPng(`${src}/a.png`);
    await goodPng(`${src}/b.png`);

    const code = await runCli([src, '--profile', 'web', '--output', out, '--no-config']);
    expect(code).toBe(0);
  });
});

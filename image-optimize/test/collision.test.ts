import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { run, parseConfig } from '../dist/index.js';

const realFiles = (dir: string) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => !f.endsWith('.tmp')) : [];

describe('output path collision is surfaced, never silent', () => {
  it('two sources that map to the same output: one errors, report does not claim both succeeded', async () => {
    const src = '/tmp/col-src';
    const out = '/tmp/col-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    // foo.png (opaque) → foo.jpg ; foo.jpg → foo.jpg  → collision on foo.jpg
    await sharp({ create: { width: 600, height: 600, channels: 3, background: { r: 230, g: 30, b: 30 } } })
      .png()
      .toFile(`${src}/foo.png`);
    await sharp({ create: { width: 600, height: 600, channels: 3, background: { r: 30, g: 200, b: 30 } } })
      .jpeg()
      .toFile(`${src}/foo.jpg`);

    const config = parseConfig({}); // defaults: opaque png → jpg
    const report = await run({ config, configSource: null, inputs: [src], outputDir: out });

    // The bug: report says processed=2, errors=0 while one file is silently lost.
    expect(report.summary.errorCount).toBe(1);
    expect(report.summary.processedCount).toBe(1);
    expect(report.errors[0]?.message ?? '').toMatch(/collision/i);
    // Only one file can physically exist at that path; that's expected.
    expect(realFiles(out)).toEqual(['foo.jpg']);
  });

  it('same stem but different output formats do NOT collide', async () => {
    const src = '/tmp/nocol-src';
    const out = '/tmp/nocol-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 10, g: 10, b: 10 } } })
      .png()
      .toFile(`${src}/foo.png`);
    await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 20, g: 20, b: 20 } } })
      .jpeg()
      .toFile(`${src}/foo.jpg`);

    // preserve: png→png, jpg→jpg → distinct outputs, no collision
    const config = parseConfig({
      pngRoute: { convert: 'preserve', routing: { opaque: 'preserve', transparent: 'preserve' } },
    });
    const report = await run({ config, configSource: null, inputs: [src], outputDir: out });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.processedCount).toBe(2);
    expect(realFiles(out).sort()).toEqual(['foo.jpg', 'foo.png']);
  });
});

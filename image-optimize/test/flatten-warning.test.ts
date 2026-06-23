import { describe, it, expect } from 'vitest';
import { rmSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { run, parseConfig } from '../dist/index.js';

/** Build a mostly-opaque RGBA PNG with a small transparent corner. */
async function almostOpaquePng(file: string, w: number, h: number, transparentSquare: number) {
  const raw = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    raw[i * 4] = 20;
    raw[i * 4 + 1] = 20;
    raw[i * 4 + 2] = 20;
    raw[i * 4 + 3] = 255;
  }
  for (let y = 0; y < transparentSquare; y++)
    for (let x = 0; x < transparentSquare; x++) raw[(y * w + x) * 4 + 3] = 0;
  await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);
}

describe('flattening transparency to a background is reported, not silent', () => {
  it('an almost-opaque PNG routed to JPG emits a flatten warning', async () => {
    const src = '/tmp/flat-src';
    const out = '/tmp/flat-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    // 1000x1000 with a 50x50 (0.25%) transparent corner → below 1% threshold → treated opaque → jpg
    await almostOpaquePng(`${src}/badge.png`, 1000, 1000, 50);

    const config = parseConfig({}); // defaults: convert auto, threshold 0.01, opaque→jpg
    const report = await run({ config, configSource: null, inputs: [src], outputDir: out });

    const entry = report.processed[0];
    expect(entry?.outputFormat).toBe('jpg');
    expect(entry?.warnings.join(' ')).toMatch(/flatten/i);
  });

  it('a fully opaque image produces no flatten warning', async () => {
    const src = '/tmp/flat2-src';
    const out = '/tmp/flat2-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    await sharp({ create: { width: 400, height: 400, channels: 3, background: { r: 10, g: 10, b: 10 } } })
      .png()
      .toFile(`${src}/solid.png`);

    const config = parseConfig({});
    const report = await run({ config, configSource: null, inputs: [src], outputDir: out });

    const entry = report.processed[0];
    expect(entry?.warnings.join(' ')).not.toMatch(/flatten/i);
  });
});

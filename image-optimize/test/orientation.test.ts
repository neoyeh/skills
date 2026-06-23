import { describe, it, expect } from 'vitest';
import { readdirSync, rmSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { run, parseConfig } from '../dist/index.js';

describe('EXIF orientation is baked into pixels before EXIF is stripped', () => {
  it('an orientation=6 image (200x100 stored) comes out upright (100x200)', async () => {
    const src = '/tmp/ori-src';
    const out = '/tmp/ori-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    // orientation 6 = rotate 90° CW on display → 200x100 stored should display as 100x200
    await sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 200, g: 50, b: 50 } } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toFile(`${src}/rot.jpg`);

    const config = parseConfig({}); // stripExif defaults true
    await run({ config, configSource: null, inputs: [src], outputDir: out });

    const file = readdirSync(out)[0]!;
    const meta = await sharp(`${out}/${file}`).metadata();
    expect({ w: meta.width, h: meta.height }).toEqual({ w: 100, h: 200 });
  });

  it('a normal image with no orientation tag is untouched (no spurious rotation)', async () => {
    const src = '/tmp/ori2-src';
    const out = '/tmp/ori2-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    await sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 50, g: 120, b: 200 } } })
      .jpeg()
      .toFile(`${src}/flat.jpg`);

    const config = parseConfig({});
    await run({ config, configSource: null, inputs: [src], outputDir: out });

    const file = readdirSync(out)[0]!;
    const meta = await sharp(`${out}/${file}`).metadata();
    expect({ w: meta.width, h: meta.height }).toEqual({ w: 200, h: 100 });
  });
});

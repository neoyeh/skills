import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { run, parseConfig } from '../dist/index.js';

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<title>hello</title><rect x="10" y="10" width="80" height="80" fill="red"/></svg>';

describe('SVG pipeline behaviour (guards the svgo override typing fix)', () => {
  it('keeps viewBox (default removeViewBox=false) and removes <title> (default removeTitle=true)', async () => {
    const src = '/tmp/svg-src';
    const out = '/tmp/svg-out';
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
    mkdirSync(src, { recursive: true });
    writeFileSync(`${src}/icon.svg`, SVG);

    const config = parseConfig({});
    const report = await run({ config, configSource: null, inputs: [src], outputDir: out });

    expect(report.summary.errorCount).toBe(0);
    const file = readdirSync(out).find((f) => f.endsWith('.svg'))!;
    const result = readFileSync(`${out}/${file}`, 'utf8');
    expect(result).toMatch(/viewBox/); // preserved
    expect(result).not.toMatch(/<title>/); // removed
  });
});

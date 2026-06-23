#!/usr/bin/env node
// Runs after `npm install -g image-optimize`.
// Creates ~/.local/bin/optimize with hardcoded absolute paths so the CLI
// works in non-login shells (e.g. Claude's Bash tool) where nvm is not loaded.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const nodePath = process.execPath;
const binDir = join(homedir(), '.local', 'bin');
const shimPath = join(binDir, 'optimize');

try {
  mkdirSync(binDir, { recursive: true });
  writeFileSync(shimPath, `#!/bin/sh\nexec "${nodePath}" "${cliPath}" "$@"\n`, { mode: 0o755 });
  console.log(`✓ optimize shim → ${shimPath}`);
  console.log(`  node: ${nodePath}`);
  console.log(`  cli:  ${cliPath}`);
  if (!process.env.PATH?.split(':').includes(binDir)) {
    console.log(`\n  Add to PATH: export PATH="$HOME/.local/bin:$PATH"`);
  }
} catch (err) {
  // Non-fatal: user can still invoke via full path or node directly.
  console.warn(`⚠ Could not create shim at ${shimPath}: ${err.message}`);
  console.warn(`  Direct invocation: ${nodePath} ${cliPath} <input> --json`);
}

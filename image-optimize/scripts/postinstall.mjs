#!/usr/bin/env node
// Runs after `npm install -g image-optimize` or `npm link`.
// 1. Creates ~/.local/bin/optimize shim with hardcoded absolute paths so the CLI
//    works in non-login shells (e.g. Claude's Bash tool) where nvm is not loaded.
// 2. Symlinks this package's directory into ~/.claude/skills/ so Claude Code discovers this skill.
//    Per Claude Code's skills spec, a skill must live at ~/.claude/skills/<name>/SKILL.md —
//    a flat ~/.claude/skills/<name>.md file is not discovered (confirmed against the official
//    docs: skills must be in directories, not flat files).
import { mkdirSync, writeFileSync, symlinkSync, existsSync, rmSync } from 'node:fs';
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

// Register skill with Claude Code — symlink the whole package directory (not just SKILL.md)
// so companion files (references/, etc.) are discoverable alongside it too.
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const claudeSkillsDir = join(homedir(), '.claude', 'skills');
const skillDest = join(claudeSkillsDir, 'image-optimize');
try {
  mkdirSync(claudeSkillsDir, { recursive: true });
  if (existsSync(skillDest)) rmSync(skillDest, { recursive: true, force: true });
  symlinkSync(packageRoot, skillDest, 'dir');
  console.log(`✓ Claude skill  → ${skillDest}/SKILL.md`);
} catch (err) {
  console.warn(`⚠ Could not register Claude skill at ${skillDest}: ${err.message}`);
  console.warn(`  Manual step: ln -s "${packageRoot}" "${skillDest}"`);
}

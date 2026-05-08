#!/usr/bin/env node
import { Command, Option } from 'commander';
import { runOptimizeCommand } from './commands/optimize.js';
import { runInitCommand } from './commands/init.js';
import { runEnvCommand } from './commands/env.js';

const program = new Command();

program
  .name('optimize')
  .description(
    'Smart image optimization — auto-routes formats based on content, ' +
      'preserves transparency, handles HEIC and animated GIFs.',
  )
  .version('0.1.0');

program
  .argument('[inputs...]', 'files or directories to optimize')
  .addOption(
    new Option('--profile <name>', 'optimization profile').choices([
      'web',
      'preserve',
      'modern',
      'blog',
      'graphic',
      'archive',
    ]),
  )
  .addOption(
    new Option('--quality <level>', 'abstract quality level').choices([
      'light',
      'balanced',
      'aggressive',
      'extreme',
    ]),
  )
  .option('--output <dir>', 'output directory')
  .option('--config <path>', 'explicit config file path')
  .option('--no-config', 'ignore config files, use built-in defaults only')
  .option('--dry-run', 'preview without writing files')
  .option('--json', 'emit machine-readable JSON to stdout')
  .action(async (inputs: string[], options) => {
    if (!inputs || inputs.length === 0) {
      program.outputHelp();
      return;
    }
    await runOptimizeCommand({ inputs, ...options });
  });

program
  .command('init')
  .description('Scaffold imgopt.config.js in the current directory')
  .addOption(
    new Option('--preset <name>', 'start from a named preset').choices([
      'web',
      'preserve',
      'modern',
      'blog',
      'graphic',
      'archive',
    ]),
  )
  .option('-y, --yes', 'accept all defaults silently (no prompts)')
  .option('--force', 'overwrite existing config file')
  .action(async (options) => {
    await runInitCommand(options);
  });

program
  .command('env')
  .description('Print runtime dependency status')
  .option('--json', 'emit machine-readable JSON')
  .action(async (options) => {
    await runEnvCommand(options);
  });

program.parseAsync().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
});

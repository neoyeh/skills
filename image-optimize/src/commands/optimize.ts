import kleur from 'kleur';
import { loadConfig } from '../config/loader.js';
import { run, type RunOptions } from '../runner.js';
import type { ProfileName, QualityLevel } from '../types.js';
import { formatPretty } from '../reporting/pretty.js';

export interface OptimizeCommandOptions {
  inputs: string[];
  profile?: ProfileName;
  quality?: QualityLevel;
  output?: string;
  flat?: boolean;
  force?: boolean;
  /** Commander: `--config <path>` → string; `--no-config` → false; absent → undefined. */
  config?: string | false;
  dryRun?: boolean;
  json?: boolean;
}

export async function runOptimizeCommand(
  options: OptimizeCommandOptions,
): Promise<void> {
  const cliOverrides: Record<string, unknown> = {};
  if (options.profile) cliOverrides.profile = options.profile;
  if (options.quality) cliOverrides.quality = options.quality;

  // Output overrides — output dir and mirrorStructure live under the same key.
  const outputOverride: Record<string, unknown> = {};
  if (options.output) outputOverride.dir = options.output;
  if (options.flat) outputOverride.mirrorStructure = false;
  if (Object.keys(outputOverride).length > 0) {
    cliOverrides.output = outputOverride;
  }

  if (options.force) cliOverrides.skipIfUpToDate = false;

  const noConfig = options.config === false;
  const configPath = typeof options.config === 'string' ? options.config : undefined;

  const loadOpts: Parameters<typeof loadConfig>[0] = { cliOverrides };
  if (noConfig) loadOpts.noConfig = true;
  if (configPath) loadOpts.configPath = configPath;

  const { config, source } = await loadConfig(loadOpts);

  // Resolve inputs: CLI args win; fall back to config.input.
  let inputs = options.inputs;
  if (inputs.length === 0 && config.input) {
    inputs = Array.isArray(config.input) ? config.input : [config.input];
  }
  if (inputs.length === 0) {
    process.stderr.write(
      kleur.red('✗') +
        ' No input specified.\n' +
        kleur.dim(
          '  Pass a file/directory as argument, or set `input` in your imgopt config.\n',
        ),
    );
    process.exit(1);
  }

  const runOpts: RunOptions = {
    config,
    configSource: source,
    inputs,
  };
  if (options.output !== undefined) runOpts.outputDir = options.output;
  if (options.dryRun !== undefined) runOpts.dryRun = options.dryRun;

  const report = await run(runOpts);

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(formatPretty(report) + '\n');
  }

  // Total failure (every file errored) → non-zero exit so CI can detect it.
  if (report.errors.length > 0 && report.processed.length === 0) {
    process.exit(2);
  }
}

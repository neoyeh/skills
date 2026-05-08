import { loadConfig } from '../config/loader.js';
import { run, type RunOptions } from '../runner.js';
import type { ProfileName, QualityLevel } from '../types.js';
import { formatPretty } from '../reporting/pretty.js';

export interface OptimizeCommandOptions {
  inputs: string[];
  profile?: ProfileName;
  quality?: QualityLevel;
  output?: string;
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
  if (options.output) cliOverrides.output = { dir: options.output };

  const noConfig = options.config === false;
  const configPath = typeof options.config === 'string' ? options.config : undefined;

  const loadOpts: Parameters<typeof loadConfig>[0] = { cliOverrides };
  if (noConfig) loadOpts.noConfig = true;
  if (configPath) loadOpts.configPath = configPath;

  const { config, source } = await loadConfig(loadOpts);

  const runOpts: RunOptions = {
    config,
    configSource: source,
    inputs: options.inputs,
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

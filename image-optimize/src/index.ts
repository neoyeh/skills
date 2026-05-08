/**
 * Public programmatic API.
 * Most users invoke the CLI via `optimize`; this module is for embedding
 * the skill into other Node tooling (build steps, custom scripts).
 */

export { run, type RunOptions } from './runner.js';
export {
  loadConfig,
  parseConfig,
  BUILTIN_DEFAULTS,
  PROFILE_OVERRIDES,
  type LoadedConfig,
  type LoadConfigOptions,
  type ResolvedConfig,
  type UserConfig,
  type Rule,
} from './config/index.js';
export { checkEnv, formatEnvStatus, type EnvStatus } from './utils/env-check.js';

export type {
  ProfileName,
  QualityLevel,
  ImageFormat,
  WritableFormat,
  TransparencyState,
  ProcessedFile,
  SkippedFile,
  FailedFile,
  RunSummary,
  RunReport,
} from './types.js';

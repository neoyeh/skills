import { cosmiconfig } from 'cosmiconfig';
import { parseConfig, type ResolvedConfig, type UserConfig } from './schema.js';
import { BUILTIN_DEFAULTS, PROFILE_OVERRIDES } from './defaults.js';
import { deepMerge } from './merge.js';
import type { ProfileName } from '../types.js';

const explorer = cosmiconfig('imgopt', {
  // Walk up from CWD until home directory, matching the behaviour users expect
  // from ESLint/Prettier/Babel/etc. cosmiconfig v9 changed the default to 'none'
  // (no walk-up), which makes the search useless for nested cwd.
  searchStrategy: 'global',
  searchPlaces: [
    'imgopt.config.js',
    'imgopt.config.mjs',
    'imgopt.config.cjs',
    'imgopt.config.json',
    '.imgoptrc.json',
    '.imgoptrc',
    'package.json',
  ],
});

export interface LoadConfigOptions {
  cwd?: string;
  configPath?: string;
  noConfig?: boolean;
  cliOverrides?: Partial<UserConfig>;
}

export interface LoadedConfig {
  config: ResolvedConfig;
  /** Absolute path to the config file used, or null if none was found / used. */
  source: string | null;
}

/**
 * Discover and load an effective config by merging four layers:
 *   built-in defaults < profile overrides < user config file < CLI overrides
 *
 * The resolved profile is determined by checking, in order:
 * CLI override > user file > built-in default ("web").
 */
export async function loadConfig(
  options: LoadConfigOptions = {}
): Promise<LoadedConfig> {
  const {
    cwd = process.cwd(),
    configPath,
    noConfig = false,
    cliOverrides = {},
  } = options;

  let userConfig: UserConfig = {};
  let source: string | null = null;

  if (!noConfig) {
    const result = configPath
      ? await explorer.load(configPath)
      : await explorer.search(cwd);
    if (result && !result.isEmpty) {
      userConfig = result.config as UserConfig;
      source = result.filepath;
    }
  }

  const profile: ProfileName =
    (cliOverrides.profile as ProfileName | undefined) ??
    (userConfig.profile as ProfileName | undefined) ??
    BUILTIN_DEFAULTS.profile;

  const profileOverride = PROFILE_OVERRIDES[profile] ?? {};

  const merged = deepMerge<Record<string, unknown>>(
    BUILTIN_DEFAULTS as unknown as Record<string, unknown>,
    profileOverride as Record<string, unknown>,
    userConfig as Record<string, unknown>,
    cliOverrides as Record<string, unknown>,
    { profile },
  );

  // Re-parse to ensure the merged result is still schema-valid.
  const config = parseConfig(merged);

  return { config, source };
}

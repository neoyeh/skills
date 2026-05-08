import { checkEnv, formatEnvStatus } from '../utils/env-check.js';

export interface EnvCommandOptions {
  json?: boolean;
}

export async function runEnvCommand(options: EnvCommandOptions): Promise<void> {
  const status = await checkEnv();
  if (options.json) {
    process.stdout.write(JSON.stringify(status, null, 2) + '\n');
  } else {
    process.stdout.write(formatEnvStatus(status) + '\n');
  }
}

import type { ResolvedConfig } from '../config/schema.js';

export interface PipelineInput {
  buffer: Buffer;
  pages: number;
  hasAlpha: boolean;
  width: number;
  height: number;
  /** When set, composite onto this colour before encoding (lossy formats only). */
  flattenWith?: string | undefined;
}

export interface PipelineOutput {
  buffer: Buffer;
  transformedBy: string[];
  warnings: string[];
}

export type Pipeline = (
  input: PipelineInput,
  config: ResolvedConfig,
) => Promise<PipelineOutput>;

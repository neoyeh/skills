import { optimize, type Config as SvgoConfig } from 'svgo';
import type { Pipeline } from './types.js';

export const svgPipeline: Pipeline = async (input, config) => {
  const source = input.buffer.toString('utf8');

  const svgoConfig: SvgoConfig = {
    multipass: config.svg.multipass,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: config.svg.removeViewBox,
            removeTitle: config.svg.removeTitle,
          },
        },
      },
    ],
  };

  const result = optimize(source, svgoConfig);
  if ('error' in result && result.error) {
    throw new Error(`SVGO failed: ${result.error}`);
  }

  return {
    buffer: Buffer.from((result as { data: string }).data, 'utf8'),
    transformedBy: ['svgo:preset-default'],
    warnings: [],
  };
};

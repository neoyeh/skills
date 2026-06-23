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
          // svgo's override type for these param-less plugins is `false | void`:
          // `false` disables, `undefined` keeps the preset default (enabled). At
          // runtime `true` and `undefined` are identical (only `false` is special-
          // cased in invokePlugins), so true→undefined preserves behaviour and typechecks.
          overrides: {
            removeViewBox: config.svg.removeViewBox ? undefined : false,
            removeTitle: config.svg.removeTitle ? undefined : false,
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

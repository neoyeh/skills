import type { WritableFormat } from '../types.js';
import type { Pipeline } from './types.js';
import { jpegPipeline } from './jpeg.js';
import { pngPipeline } from './png.js';
import { webpPipeline } from './webp.js';
import { avifPipeline } from './avif.js';
import { svgPipeline } from './svg.js';
import { gifPipeline } from './gif.js';

const PIPELINES: Record<WritableFormat, Pipeline> = {
  jpg: jpegPipeline,
  png: pngPipeline,
  webp: webpPipeline,
  avif: avifPipeline,
  svg: svgPipeline,
  gif: gifPipeline,
};

export function getPipeline(format: WritableFormat): Pipeline {
  return PIPELINES[format];
}

export type { Pipeline, PipelineInput, PipelineOutput } from './types.js';

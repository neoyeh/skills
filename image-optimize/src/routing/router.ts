import type { ResolvedConfig } from '../config/schema.js';
import type { ImageFormat, WritableFormat, TransparencyState } from '../types.js';

export interface RouteContext {
  format: ImageFormat;
  pages: number;
  hasAlpha: boolean;
  transparency: TransparencyState;
}

export interface RouteDecision {
  outputFormat: WritableFormat;
  /** Composite onto this background colour before encoding (e.g., '#ffffff'). */
  flattenWith?: string;
  /** Free-form labels that get reported in transformedBy. */
  labels: string[];
}

/**
 * Decide the output format for a given input + active config.
 *
 * The decision tree is intentionally explicit per input format —
 * spreading conditionals is worth it for routing transparency.
 */
export function decideRoute(
  ctx: RouteContext,
  config: ResolvedConfig,
): RouteDecision {
  const labels: string[] = [];

  switch (ctx.format) {
    case 'svg':
      return { outputFormat: 'svg', labels: ['svg-passthrough'] };

    case 'heic': {
      const target = config.heicRoute.convert; // 'jpg' | 'webp' | 'avif'
      labels.push(`heic-route:${target}`);
      return { outputFormat: target, labels };
    }

    case 'gif': {
      if (ctx.pages > 1) {
        // Animated GIF
        const target = config.gifRoute.animated; // 'webp' | 'preserve'
        if (target === 'preserve') {
          labels.push('gif-animated:preserve');
          return { outputFormat: 'gif', labels };
        }
        labels.push('gif-animated:webp');
        return { outputFormat: 'webp', labels };
      }
      // Static GIF — fall through to "static gif" handling
      const target = config.gifRoute.static; // 'auto' | 'jpg' | 'png' | 'preserve'
      if (target === 'preserve') {
        labels.push('gif-static:preserve');
        return { outputFormat: 'gif', labels };
      }
      if (target === 'auto') {
        const fmt: WritableFormat = ctx.hasAlpha ? 'png' : 'jpg';
        labels.push(`gif-static:auto->${fmt}`);
        return { outputFormat: fmt, labels };
      }
      labels.push(`gif-static:${target}`);
      return { outputFormat: target, labels };
    }

    case 'png': {
      const route = config.pngRoute;
      // Direct override forms first
      if (route.convert === 'preserve') {
        labels.push('png-route:preserve');
        return { outputFormat: 'png', labels };
      }
      if (route.convert === 'webp') {
        labels.push('png-route:webp');
        return { outputFormat: 'webp', labels };
      }
      if (route.convert === 'jpg') {
        labels.push('png-route:jpg-forced');
        const decision: RouteDecision = { outputFormat: 'jpg', labels };
        if (ctx.hasAlpha && route.flattenWith) {
          decision.flattenWith = route.flattenWith;
          labels.push(`flatten:${route.flattenWith}`);
        }
        return decision;
      }

      // 'auto' — transparency-aware
      if (ctx.transparency === 'transparent') {
        const target = route.routing.transparent; // 'preserve' | 'webp'
        const out: WritableFormat = target === 'preserve' ? 'png' : 'webp';
        labels.push(`png-route:auto->transparent->${out}`);
        return { outputFormat: out, labels };
      }
      // opaque or almost-opaque
      const target = route.routing.opaque; // 'jpg' | 'webp' | 'preserve'
      const out: WritableFormat =
        target === 'preserve' ? 'png' : (target as WritableFormat);
      labels.push(`png-route:auto->opaque->${out}`);
      const decision: RouteDecision = { outputFormat: out, labels };
      if (
        ctx.transparency === 'almost-opaque' &&
        out === 'jpg' &&
        route.flattenWith
      ) {
        decision.flattenWith = route.flattenWith;
        labels.push(`flatten:${route.flattenWith}`);
      }
      return decision;
    }

    case 'jpg':
      labels.push('jpg-passthrough');
      return { outputFormat: 'jpg', labels };

    case 'webp':
      labels.push('webp-passthrough');
      return { outputFormat: 'webp', labels };

    case 'avif':
      labels.push('avif-passthrough');
      return { outputFormat: 'avif', labels };

    case 'tiff':
    case 'bmp': {
      // Treat as photo by default → JPG (or WebP/AVIF for modern profile)
      // Honour PNG opaque routing as a hint for "modern" profiles.
      const hint = config.pngRoute.routing.opaque;
      const out: WritableFormat =
        hint === 'preserve' ? 'jpg' : (hint as WritableFormat);
      labels.push(`${ctx.format}-route:${out}`);
      return { outputFormat: out, labels };
    }

    default: {
      // Defensive: shouldn't be reachable thanks to the union type.
      labels.push('fallback:jpg');
      return { outputFormat: 'jpg', labels };
    }
  }
}

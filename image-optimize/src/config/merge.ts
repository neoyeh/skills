type Plain = Record<string, unknown>;

function isPlainObject(v: unknown): v is Plain {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively merge plain objects. Later sources win.
 * Arrays are replaced (not concatenated) — config arrays like `rules` are
 * meant to be authoritative at the layer that defines them.
 */
export function deepMerge<T extends Plain>(
  ...sources: Array<Partial<T> | undefined | null>
): T {
  const out: Plain = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [k, v] of Object.entries(source)) {
      if (v === undefined) continue;
      const prev = out[k];
      if (isPlainObject(v) && isPlainObject(prev)) {
        out[k] = deepMerge(prev, v);
      } else {
        out[k] = v;
      }
    }
  }
  return out as T;
}

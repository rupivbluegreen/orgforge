// strip named fields at any depth
export function redactContext<T>(context: T, fields: string[]): T {
  const fieldSet = new Set(fields);
  const strip = (val: unknown): unknown => {
    if (Array.isArray(val)) return val.map(strip);
    if (val && typeof val === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val)) {
        if (fieldSet.has(k)) continue;
        out[k] = strip(v);
      }
      return out;
    }
    return val;
  };
  return strip(context) as T;
}

// Server responses are untrusted input: these helpers coerce every field so a malformed
// or tampered payload can't crash or inject into the UI.

export type Json = Record<string, unknown>;

export function asObject(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

export function asNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(asString(value));
  return Number.isFinite(n) ? n : 0;
}

export function asId(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseInt(asString(value), 10);
  return Number.isInteger(n) ? n : null;
}

export function asHttpsUrl(value: unknown): string | null {
  const url = asString(value);
  return url.startsWith('https://') ? url : null;
}

/** Accepts `[...]`, `{ data: [...] }` or `{ data: { data: [...] } }` (Laravel pagination). */
export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const data = asObject(value)?.data;
  if (Array.isArray(data)) return data;
  const nested = asObject(data)?.data;
  return Array.isArray(nested) ? nested : [];
}

/** Unwraps `{ data: {...} }` envelopes; returns the object itself otherwise. */
export function unwrap(value: unknown): Json {
  const obj = asObject(value) ?? {};
  return asObject(obj.data) ?? obj;
}

export function pick(obj: Json, ...keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

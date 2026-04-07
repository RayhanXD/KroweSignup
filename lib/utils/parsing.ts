/**
 * Parse JSON from a string; return null if empty or invalid.
 */
export function safeJson<T>(raw: string | null | undefined): T | null {
  if (raw == null || !String(raw).trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

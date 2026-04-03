/**
 * Splits a summary string into bullet-point sentences for display only.
 * Does NOT modify or expose the underlying summary to any pipeline.
 */
export function summaryToBullets(summary: string): string[] {
  return summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

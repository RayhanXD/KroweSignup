/**
 * Formatting helpers for report UI. Used only by the Dashboard; backend types unchanged.
 */

export type UsdRange = { low: number; high: number };

/**
 * Format a USD range as compact currency for market size (e.g. "$1B–$10B/year", "$100M–$1.5B/year").
 */
export function formatUsdRange(
  range: UsdRange | null | undefined,
  unit: string = "year"
): string {
  if (!range || typeof range.low !== "number" || typeof range.high !== "number") {
    return "—";
  }
  const { low, high } = range;
  const suffix = unit === "year" ? "/year" : "";
  if (high >= 1e9) {
    const l = low / 1e9;
    const h = high / 1e9;
    return formatCompact(l, h, "B") + suffix;
  }
  if (high >= 1e6) {
    const l = low / 1e6;
    const h = high / 1e6;
    return formatCompact(l, h, "M") + suffix;
  }
  if (high >= 1e3) {
    const l = low / 1e3;
    const h = high / 1e3;
    return formatCompact(l, h, "K") + suffix;
  }
  return `$${formatNum(low)}–$${formatNum(high)}${suffix}`;
}

function formatCompact(low: number, high: number, suffix: string): string {
  const lStr = low >= 1 ? String(Math.round(low)) : low.toFixed(1);
  const hStr = high >= 1 ? String(Math.round(high)) : high.toFixed(1);
  return `$${lStr}–${hStr}${suffix}`;
}

function formatNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.round(n).toLocaleString();
}

/**
 * Format planning year 1 target revenue as "~$1–3B/year" style.
 */
export function formatPlanningYear1(planningYear1: {
  planning_market_size_usd_range?: { low: number; high: number };
  target_revenue_usd?: { low: number; high: number };
} | null | undefined): string {
  const range =
    planningYear1?.planning_market_size_usd_range ??
    planningYear1?.target_revenue_usd;
  if (!range || typeof range.low !== "number" || typeof range.high !== "number") {
    return "—";
  }
  const { low, high } = range;
  if (high >= 1e9) {
    const l = low / 1e9;
    const h = high / 1e9;
    return "~$" + (l >= 1 ? Math.round(l) : l.toFixed(1)) + "–" + (h >= 1 ? Math.round(h) : h.toFixed(1)) + "B/year";
  }
  if (high >= 1e6) {
    const l = low / 1e6;
    const h = high / 1e6;
    return "~$" + (l >= 1 ? Math.round(l) : l.toFixed(1)) + "–" + (h >= 1 ? Math.round(h) : h.toFixed(1)) + "M/year";
  }
  return "~$" + formatNum(low) + "–" + formatNum(high) + "/year";
}

/**
 * Format MVP cost range as "$2,500 – $18,000".
 */
export function formatMvpCostRange(
  lowUsd: number | null | undefined,
  highUsd: number | null | undefined
): string {
  if (typeof lowUsd !== "number" || typeof highUsd !== "number") {
    return "—";
  }
  return `$${Math.round(lowUsd).toLocaleString()} – $${Math.round(highUsd).toLocaleString()}`;
}

/**
 * Split recommended_mvp_scope string into array of scope items (by newlines or bullets).
 */
export function parseMvpScopeList(scopeText: string | null | undefined): string[] {
  if (!scopeText || typeof scopeText !== "string") return [];
  return scopeText
    .split(/\n|•|[-*]\s+/)
    .map((s) => s.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

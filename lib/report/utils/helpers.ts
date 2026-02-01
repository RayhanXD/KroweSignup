/**
 * Helper utilities for report building
 */

import { StepKey } from "../../signupSteps";
import type { SignupPayload } from "../../types/report";
import { safeNumber } from "../../utils/parsing";

/**
 * Extract final answer from payload for a given step key
 */
export function getFinal(payload: SignupPayload, key: StepKey): string | null {
  const v = payload?.[key]?.final;
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

/**
 * Classify hours commitment into a readable label
 */
export function classifyHours(hours: number | null): string | null {
  if (hours == null) return "⚠ Missing Data";
  if (hours <= 3) return "To little hours, nothing will get done";
  if (hours <= 7) return "Light commitment (slow progress/min results expected)";
  if (hours <= 12) return "Normal Commintent (progress is attainable)";
  if (hours <= 18) return "Serious Commitent";
  if (hours <= 25) return "Embrassing True startup hours";
  if (hours <= 35) return "Bound to succeed if you dont burn out";
  if (hours <= 50) return "High Burnout Risk";
  return "Completely unreasonable";
}

/**
 * Format number as USD with abbreviations
 */
export function formatUSD(n: number): string {
  return `$${n.toLocaleString()}`;
}

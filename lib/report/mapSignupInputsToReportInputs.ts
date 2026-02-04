/**
 * Maps flat signup answer inputs to the SignupPayload structure expected by buildReportFromPayload.
 *
 * The signup_answers table stores { step_key: string, final_answer: string | null }
 * but buildReportFromPayload expects { [key]: { final: string } } structure
 * so that getFinal(payload, key) can extract payload[key].final.
 *
 * This mapper also handles any key name differences between step_key values
 * and the keys that buildReportFromPayload expects.
 */

import type { SignupPayload } from "../types/report";

/**
 * Key mapping from signup answer step_key to report payload key.
 * Most keys match directly; add entries here for any that differ.
 *
 * Format: { source_step_key: target_payload_key }
 */
const KEY_MAP: Record<string, string> = {
  // Direct mappings (step_key matches expected key)
  age: "age",
  idea: "idea",
  product_type: "product_type",
  problem: "problem",
  target_customer: "target_customer",
  industry: "industry",
  skills: "skills",
  team_size: "team_size",
  hours: "hours",

  // TODO: industry_experience from signup answers is not currently used by buildReportFromPayload.
  // The industryFamiliarityScore function expects experience text, but buildReportFromPayload
  // passes the industry name instead. Consider adding this mapping if the report builder
  // is updated to use industry_experience:
  // industry_experience: "industry_experience",
  industry_experience: "industry_experience",
};

/**
 * Convert flat signup inputs { key: "value" } to SignupPayload { key: { final: "value" } }
 *
 * @param inputs - Flat record from buildInputsFromAnswers (step_key -> final_answer)
 * @returns SignupPayload structure expected by buildReportFromPayload
 */
export function mapSignupInputsToReportInputs(
  inputs: Record<string, string | null>
): SignupPayload {
  const payload: SignupPayload = {};

  for (const [stepKey, value] of Object.entries(inputs)) {
    const targetKey = KEY_MAP[stepKey] ?? stepKey;

    // Wrap in { final: value } structure expected by getFinal()
    // Keep null values so report builder can still show ⚠ Missing Data
    payload[targetKey] = {
      final: value ?? undefined,
    };
  }

  return payload;
}

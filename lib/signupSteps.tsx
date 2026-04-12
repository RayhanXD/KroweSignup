export type StepKey =
  | "idea"
  | "product_type"
  | "features"
  | "problem"
  | "target_customer"
  | "industry"
  | "competitors"
  | "alternatives"
  | "pricing_model"
  | "interview_count"
  | "interview_upload"
  | "startup_stage"

export const SIGNUP_STEPS: StepKey[] = [
  "idea",
  "product_type",
  "features",
  "problem",
  "target_customer",
  "industry",
  "competitors",
  "alternatives",
  "pricing_model",
  "interview_count",
  "interview_upload",
  "startup_stage",
]

export function isValidStepKey(v: string): v is StepKey {
  return (SIGNUP_STEPS as string[]).includes(v)
}

/** Coerce API/DB step strings to a valid StepKey. */
export function normalizeStepKey(k: string): StepKey {
  if (isValidStepKey(k)) return k;
  return getFirstStepKey();
}

export function getFirstStepKey(): StepKey {
  return SIGNUP_STEPS[0]
}

export function getNextStepKey(current: StepKey): StepKey | null {
  const idx = SIGNUP_STEPS.indexOf(current)
  if (idx === -1) return null
  return SIGNUP_STEPS[idx + 1] ?? null
}

export function getPrevStepKey(current: StepKey): StepKey | null {
  const idx = SIGNUP_STEPS.indexOf(current)
  if (idx <= 0) return null
  return SIGNUP_STEPS[idx - 1] ?? null
}

export function getProgressPercent(current: StepKey): number {
  const idx = SIGNUP_STEPS.indexOf(current)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / SIGNUP_STEPS.length) * 100)
}

export function getNextStepKeyForContext(
  current: StepKey,
  context: { interviewCount?: number }
): StepKey | null {
  if (current === "interview_count") {
    return (context.interviewCount ?? 0) > 0 ? "interview_upload" : "startup_stage";
  }
  return getNextStepKey(current);
}

export function getPrevStepKeyForContext(
  current: StepKey,
  context: { interviewCount?: number }
): StepKey | null {
  if (current === "startup_stage") {
    return (context.interviewCount ?? 0) > 0 ? "interview_upload" : "interview_count";
  }
  return getPrevStepKey(current);
}

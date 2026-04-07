import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingData } from "@/lib/analysis/assumptionMatching";

/** Rows returned from `signup_answers` for founder context. */
export type SignupAnswerRow = {
  step_key: string;
  final_answer: string | null;
};

export const STEP_KEYS_SCRIPT = [
  "idea",
  "problem",
  "target_customer",
  "features",
] as const;

export const STEP_KEYS_PIPELINE_EARLY = ["idea", "problem"] as const;

export const STEP_KEYS_PIPELINE_FULL = [
  "idea",
  "problem",
  "target_customer",
  "industry",
  "features",
  "competitors",
  "alternatives",
  "pricing_model",
] as const;

export type FounderContextShape = {
  idea: string | null;
  problem: string | null;
  targetCustomer: string | null;
  industry: string | null;
};

/** Payload shape expected by `generateScript` (non-null when any script step exists). */
export type ScriptOnboardingPayload = {
  idea: string;
  problem: string;
  target_customer: string;
  features: string[];
};

function signupAnswersToByKey(
  rows: SignupAnswerRow[] | null | undefined
): Record<string, string> {
  if (!rows?.length) return {};
  return Object.fromEntries(
    rows.map((r) => [r.step_key, r.final_answer ?? ""])
  );
}

/** Parse `features` final_answer the same way as the interview script route (JSON array or plain string). */
export function parseFeaturesForScript(featuresRaw: string): string[] {
  if (!featuresRaw) return [];
  try {
    const parsed = JSON.parse(featuresRaw);
    return Array.isArray(parsed) ? parsed.map(String) : [featuresRaw];
  } catch {
    return [featuresRaw];
  }
}

export async function fetchSignupAnswersForSession(
  supabase: SupabaseClient,
  sessionId: string,
  stepKeys: readonly string[]
): Promise<SignupAnswerRow[]> {
  const { data, error } = await supabase
    .from("signup_answers")
    .select("step_key, final_answer")
    .eq("session_id", sessionId)
    .in("step_key", [...stepKeys]);

  if (error) {
    console.warn("[founderContextFromSignup] fetch signup_answers:", error.message);
    return [];
  }
  return (data ?? []) as SignupAnswerRow[];
}

export function buildEarlyFounderFromRows(
  rows: SignupAnswerRow[] | null | undefined
): { idea: string | null; problem: string | null } {
  if (!rows?.length) return { idea: null, problem: null };
  const byKey = Object.fromEntries(
    rows.map((r) => [r.step_key, r.final_answer])
  ) as Record<string, unknown>;
  const idea = byKey.idea;
  const problem = byKey.problem;
  return {
    idea: typeof idea === "string" ? idea : null,
    problem: typeof problem === "string" ? problem : null,
  };
}

/** For `generateScript`: null if there are no answer rows. */
export function buildScriptOnboardingFromRows(
  rows: SignupAnswerRow[] | null | undefined
): ScriptOnboardingPayload | null {
  if (!rows?.length) return null;
  const byKey = signupAnswersToByKey(rows);
  const featuresArray = parseFeaturesForScript(byKey.features ?? "");
  return {
    idea: byKey.idea ?? "",
    problem: byKey.problem ?? "",
    target_customer: byKey.target_customer ?? "",
    features: featuresArray,
  };
}

export function buildFounderContextAndOnboardingFromRows(
  rows: SignupAnswerRow[] | null | undefined
): {
  founderContext: FounderContextShape | null;
  onboarding: OnboardingData | undefined;
} {
  if (!rows?.length) {
    return { founderContext: null, onboarding: undefined };
  }
  const byKey = Object.fromEntries(
    rows.map((r) => [r.step_key, r.final_answer])
  ) as Record<string, unknown>;
  const get = (key: string) => {
    const v = byKey[key];
    return typeof v === "string" ? v : null;
  };
  const founderContext: FounderContextShape = {
    idea: get("idea"),
    problem: get("problem"),
    targetCustomer: get("target_customer"),
    industry: get("industry"),
  };
  const onboarding: OnboardingData = {
    idea: get("idea"),
    problem: get("problem"),
    target_customer: get("target_customer"),
    industry: get("industry"),
    features: get("features"),
    competitors: get("competitors"),
    alternatives: get("alternatives"),
    pricing_model: get("pricing_model"),
  };
  return { founderContext, onboarding };
}

/** Helpers for the hypothesis-vs-reality analysis route (`getAnswer` + feature list). */
export function buildAnalysisAnswerHelpers(rows: SignupAnswerRow[]): {
  getAnswer: (key: string) => string;
  featuresArray: string[];
} {
  const byKey = signupAnswersToByKey(rows);
  const getAnswer = (key: string) => byKey[key] ?? "";
  return {
    getAnswer,
    featuresArray: parseFeaturesForScript(getAnswer("features")),
  };
}

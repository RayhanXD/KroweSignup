import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SignupAnswerRow } from "@/lib/interviews/founderContextFromSignup";
import { URL_ONBOARDING_STEP_KEYS } from "@/lib/signup/urlOnboarding";

export const ONBOARDING_MODES = ["manual", "webscraper"] as const;
export type OnboardingMode = (typeof ONBOARDING_MODES)[number];

const stringField = z.string().trim().max(2000);
const stringArrayField = z.array(z.string().trim().min(1).max(300)).max(20);

const businessProfileSchema = z.object({
  companySnapshot: z.object({
    companyName: stringField,
    productName: stringField,
    valueProposition: stringField,
    stage: stringField,
    teamSize: stringField,
    industryCategory: stringField,
  }),
  customerMarketFocus: z.object({
    primaryCustomerSegment: stringField,
    secondaryCustomerSegment: stringField,
    jobsToBeDone: stringArrayField,
    acquisitionChannels: stringArrayField,
    geographicFocus: stringField,
  }),
  problemHypothesis: z.object({
    coreProblemStatement: stringField,
    currentProductHypothesis: stringField,
    assumptionsBeingTested: stringArrayField,
    invalidationSignals: stringArrayField,
  }),
  successCriteria: z.object({
    decisionObjective: stringField,
    primaryKpis: stringArrayField,
    targetMetricAndTimeframe: stringField,
    nonGoals: stringArrayField,
  }),
  constraints: z.object({
    budgetConstraints: stringField,
    timelineConstraints: stringField,
    technicalConstraints: stringField,
    teamResourceConstraints: stringField,
    complianceConstraints: stringField,
    budgetCeiling: stringField,
    deadlineTarget: stringField,
    teamCapacity: stringField,
  }),
  competitiveContext: z.object({
    alternativesToday: stringArrayField,
    directCompetitors: stringArrayField,
    indirectCompetitors: stringArrayField,
    switchingBehavior: stringField,
  }),
  decisionRules: z.object({
    evidenceThreshold: stringField,
    confidenceRubric: stringField,
    requiredArtifacts: stringArrayField,
  }),
});

export type BusinessProfile = z.infer<typeof businessProfileSchema>;

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  companySnapshot: {
    companyName: "",
    productName: "",
    valueProposition: "",
    stage: "",
    teamSize: "",
    industryCategory: "",
  },
  customerMarketFocus: {
    primaryCustomerSegment: "",
    secondaryCustomerSegment: "",
    jobsToBeDone: [],
    acquisitionChannels: [],
    geographicFocus: "",
  },
  problemHypothesis: {
    coreProblemStatement: "",
    currentProductHypothesis: "",
    assumptionsBeingTested: [],
    invalidationSignals: [],
  },
  successCriteria: {
    decisionObjective: "",
    primaryKpis: [],
    targetMetricAndTimeframe: "",
    nonGoals: [],
  },
  constraints: {
    budgetConstraints: "",
    timelineConstraints: "",
    technicalConstraints: "",
    teamResourceConstraints: "",
    complianceConstraints: "",
    budgetCeiling: "",
    deadlineTarget: "",
    teamCapacity: "",
  },
  competitiveContext: {
    alternativesToday: [],
    directCompetitors: [],
    indirectCompetitors: [],
    switchingBehavior: "",
  },
  decisionRules: {
    evidenceThreshold: "",
    confidenceRubric: "",
    requiredArtifacts: [],
  },
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
}

export function emptyBusinessProfile(): BusinessProfile {
  return structuredClone(DEFAULT_BUSINESS_PROFILE);
}

function normalizeBusinessProfile(input: unknown): BusinessProfile {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const companySnapshot =
    raw.companySnapshot && typeof raw.companySnapshot === "object"
      ? (raw.companySnapshot as Record<string, unknown>)
      : {};
  const customerMarketFocus =
    raw.customerMarketFocus && typeof raw.customerMarketFocus === "object"
      ? (raw.customerMarketFocus as Record<string, unknown>)
      : {};
  const problemHypothesis =
    raw.problemHypothesis && typeof raw.problemHypothesis === "object"
      ? (raw.problemHypothesis as Record<string, unknown>)
      : {};
  const successCriteria =
    raw.successCriteria && typeof raw.successCriteria === "object"
      ? (raw.successCriteria as Record<string, unknown>)
      : {};
  const constraints =
    raw.constraints && typeof raw.constraints === "object"
      ? (raw.constraints as Record<string, unknown>)
      : {};
  const competitiveContext =
    raw.competitiveContext && typeof raw.competitiveContext === "object"
      ? (raw.competitiveContext as Record<string, unknown>)
      : {};
  const decisionRules =
    raw.decisionRules && typeof raw.decisionRules === "object"
      ? (raw.decisionRules as Record<string, unknown>)
      : {};

  return {
    companySnapshot: {
      companyName: normalizeString(companySnapshot.companyName),
      productName: normalizeString(companySnapshot.productName),
      valueProposition: normalizeString(companySnapshot.valueProposition),
      stage: normalizeString(companySnapshot.stage),
      teamSize: normalizeString(companySnapshot.teamSize),
      industryCategory: normalizeString(companySnapshot.industryCategory),
    },
    customerMarketFocus: {
      primaryCustomerSegment: normalizeString(customerMarketFocus.primaryCustomerSegment),
      secondaryCustomerSegment: normalizeString(customerMarketFocus.secondaryCustomerSegment),
      jobsToBeDone: normalizeStringArray(customerMarketFocus.jobsToBeDone),
      acquisitionChannels: normalizeStringArray(customerMarketFocus.acquisitionChannels),
      geographicFocus: normalizeString(customerMarketFocus.geographicFocus),
    },
    problemHypothesis: {
      coreProblemStatement: normalizeString(problemHypothesis.coreProblemStatement),
      currentProductHypothesis: normalizeString(problemHypothesis.currentProductHypothesis),
      assumptionsBeingTested: normalizeStringArray(problemHypothesis.assumptionsBeingTested),
      invalidationSignals: normalizeStringArray(problemHypothesis.invalidationSignals),
    },
    successCriteria: {
      decisionObjective: normalizeString(successCriteria.decisionObjective),
      primaryKpis: normalizeStringArray(successCriteria.primaryKpis),
      targetMetricAndTimeframe: normalizeString(successCriteria.targetMetricAndTimeframe),
      nonGoals: normalizeStringArray(successCriteria.nonGoals),
    },
    constraints: {
      budgetConstraints: normalizeString(constraints.budgetConstraints),
      timelineConstraints: normalizeString(constraints.timelineConstraints),
      technicalConstraints: normalizeString(constraints.technicalConstraints),
      teamResourceConstraints: normalizeString(constraints.teamResourceConstraints),
      complianceConstraints: normalizeString(constraints.complianceConstraints),
      budgetCeiling: normalizeString(constraints.budgetCeiling),
      deadlineTarget: normalizeString(constraints.deadlineTarget),
      teamCapacity: normalizeString(constraints.teamCapacity),
    },
    competitiveContext: {
      alternativesToday: normalizeStringArray(competitiveContext.alternativesToday),
      directCompetitors: normalizeStringArray(competitiveContext.directCompetitors),
      indirectCompetitors: normalizeStringArray(competitiveContext.indirectCompetitors),
      switchingBehavior: normalizeString(competitiveContext.switchingBehavior),
    },
    decisionRules: {
      evidenceThreshold: normalizeString(decisionRules.evidenceThreshold),
      confidenceRubric: normalizeString(decisionRules.confidenceRubric),
      requiredArtifacts: normalizeStringArray(decisionRules.requiredArtifacts),
    },
  };
}

export function parseBusinessProfile(value: unknown): BusinessProfile {
  const normalized = normalizeBusinessProfile(value);
  const result = businessProfileSchema.safeParse(normalized);
  if (result.success) return result.data;
  return emptyBusinessProfile();
}

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 20);
    }
  } catch {
    // ignore
  }

  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseIndustry(industryRaw: string | null | undefined): string {
  if (!industryRaw) return "";
  try {
    const parsed = JSON.parse(industryRaw) as { industry?: string; other?: string };
    if (parsed.other?.trim()) return parsed.other.trim();
    if (parsed.industry?.trim()) return parsed.industry.trim();
  } catch {
    // ignore
  }
  return industryRaw.trim();
}

function signupRowsToMap(rows: SignupAnswerRow[] | null | undefined): Record<string, string> {
  if (!rows?.length) return {};
  return Object.fromEntries(rows.map((r) => [r.step_key, r.final_answer ?? ""]));
}

export function prefillBusinessProfileFromSignup(rows: SignupAnswerRow[] | null | undefined): BusinessProfile {
  const byKey = signupRowsToMap(rows);
  const idea = (byKey.idea ?? "").trim();
  const problem = (byKey.problem ?? "").trim();
  const targetCustomer = (byKey.target_customer ?? "").trim();
  const stage = (byKey.startup_stage ?? "").trim();
  const industry = parseIndustry(byKey.industry);
  const features = parseStringArray(byKey.features);
  const competitors = parseStringArray(byKey.competitors);
  const alternatives = parseStringArray(byKey.alternatives);

  return parseBusinessProfile({
    ...DEFAULT_BUSINESS_PROFILE,
    companySnapshot: {
      ...DEFAULT_BUSINESS_PROFILE.companySnapshot,
      valueProposition: idea,
      stage,
      industryCategory: industry,
    },
    customerMarketFocus: {
      ...DEFAULT_BUSINESS_PROFILE.customerMarketFocus,
      primaryCustomerSegment: targetCustomer,
    },
    problemHypothesis: {
      ...DEFAULT_BUSINESS_PROFILE.problemHypothesis,
      coreProblemStatement: problem,
      assumptionsBeingTested: features,
    },
    successCriteria: {
      ...DEFAULT_BUSINESS_PROFILE.successCriteria,
      decisionObjective: "Decide what to build next based on strongest interview signal.",
    },
    constraints: {
      ...DEFAULT_BUSINESS_PROFILE.constraints,
      timelineConstraints: stage ? `Current stage: ${stage}` : "",
    },
    competitiveContext: {
      ...DEFAULT_BUSINESS_PROFILE.competitiveContext,
      directCompetitors: competitors,
      alternativesToday: alternatives,
      indirectCompetitors: alternatives,
    },
  });
}

function hasAtLeastOneConstraint(profile: BusinessProfile): boolean {
  const c = profile.constraints;
  const fields = [
    c.budgetConstraints,
    c.timelineConstraints,
    c.technicalConstraints,
    c.teamResourceConstraints,
    c.complianceConstraints,
    c.budgetCeiling,
    c.deadlineTarget,
    c.teamCapacity,
  ];
  return fields.some((value) => value.trim().length > 0);
}

export function validateBusinessProfileCompletion(profile: BusinessProfile): {
  ok: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!profile.problemHypothesis.coreProblemStatement.trim()) {
    missingFields.push("problemHypothesis.coreProblemStatement");
  }
  if (!profile.customerMarketFocus.primaryCustomerSegment.trim()) {
    missingFields.push("customerMarketFocus.primaryCustomerSegment");
  }
  if (!profile.successCriteria.decisionObjective.trim()) {
    missingFields.push("successCriteria.decisionObjective");
  }
  if (!hasAtLeastOneConstraint(profile)) {
    missingFields.push("constraints");
  }

  return {
    ok: missingFields.length === 0,
    missingFields,
  };
}

export function businessProfileContextLines(profile: BusinessProfile): string[] {
  const lines: string[] = [];
  const push = (label: string, value: string | string[]) => {
    if (Array.isArray(value)) {
      const cleaned = value.map((v) => v.trim()).filter(Boolean);
      if (!cleaned.length) return;
      lines.push(`${label}: ${cleaned.join(", ")}`);
      return;
    }
    const cleaned = value.trim();
    if (!cleaned) return;
    lines.push(`${label}: ${cleaned}`);
  };

  push("Value proposition", profile.companySnapshot.valueProposition);
  push("Stage", profile.companySnapshot.stage);
  push("Primary customer", profile.customerMarketFocus.primaryCustomerSegment);
  push("Core problem", profile.problemHypothesis.coreProblemStatement);
  push("Hypothesis", profile.problemHypothesis.currentProductHypothesis);
  push("Assumptions", profile.problemHypothesis.assumptionsBeingTested);
  push("Decision objective", profile.successCriteria.decisionObjective);
  push("Primary KPIs", profile.successCriteria.primaryKpis);
  push("Constraint budget", profile.constraints.budgetConstraints);
  push("Constraint timeline", profile.constraints.timelineConstraints);
  push("Constraint technical", profile.constraints.technicalConstraints);
  push("Constraint team", profile.constraints.teamResourceConstraints);
  push("Constraint compliance", profile.constraints.complianceConstraints);
  push("Direct competitors", profile.competitiveContext.directCompetitors);
  push("Alternatives", profile.competitiveContext.alternativesToday);
  push("Decision evidence threshold", profile.decisionRules.evidenceThreshold);

  return lines;
}

export type WebscraperCompletion = {
  completed: boolean;
  onboardingMode: OnboardingMode | null;
};

export async function deriveOnboardingCompletion(
  supabase: SupabaseClient,
  sessionId: string | null | undefined
): Promise<WebscraperCompletion> {
  if (!sessionId) {
    return { completed: false, onboardingMode: null };
  }

  const answersRes = await supabase
    .from("signup_answers")
    .select("step_key, final_source, final_answer")
    .eq("session_id", sessionId)
    .in("step_key", URL_ONBOARDING_STEP_KEYS);

  if (answersRes.error) {
    return { completed: false, onboardingMode: null };
  }

  const answerRows = answersRes.data ?? [];
  const answerByKey = new Map(
    answerRows.map((row) => [row.step_key, (row.final_answer ?? "").trim()])
  );
  const hasAllRequiredAnswers = URL_ONBOARDING_STEP_KEYS.every((key) => {
    const value = answerByKey.get(key);
    return Boolean(value && value.length > 0);
  });
  if (!hasAllRequiredAnswers) {
    return { completed: false, onboardingMode: null };
  }

  const hasWebscraperSource = answerRows.some((row) => {
    const source = typeof row.final_source === "string" ? row.final_source : "";
    return source === "ai_suggested" || source === "user_edited";
  });

  if (hasWebscraperSource) {
    return { completed: true, onboardingMode: "webscraper" };
  }

  return { completed: true, onboardingMode: "manual" };
}

export async function deriveWebscraperCompletion(
  supabase: SupabaseClient,
  sessionId: string | null | undefined
): Promise<WebscraperCompletion> {
  const onboarding = await deriveOnboardingCompletion(supabase, sessionId);
  if (onboarding.onboardingMode === "webscraper") {
    return { completed: true, onboardingMode: "webscraper" };
  }
  return { completed: false, onboardingMode: null };
}

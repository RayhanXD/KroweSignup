import type { StepKey } from "@/lib/signupSteps";

export type StartupStage = "idea" | "validation" | "pre-mvp" | "mvp" | "early-traction" | "growth";
export type ProductType = "mobile" | "web" | "both" | "other";

export type IndustryId =
  | "edtech"
  | "fintech"
  | "health"
  | "ecommerce"
  | "saas"
  | "marketplace"
  | "creator"
  | "other";

export type PricingModel =
  | "free"
  | "freemium"
  | "subscription"
  | "one_time"
  | "usage_based"
  | "marketplace"
  | "enterprise";

export type IndustryValue = {
  industry: IndustryId | null;
  other: string;
};

export type PricingModelValue = {
  pricingModels: PricingModel[];
  estimatedPrice: string | null;
};

export type UrlOnboardingDraft = {
  idea: string;
  product_type: ProductType;
  features: string[];
  problem: string;
  target_customer: string;
  industry: IndustryValue;
  competitors: string[];
  alternatives: string[];
  pricing_model: PricingModelValue;
  interview_count: string;
  startup_stage: StartupStage;
};

export const URL_ONBOARDING_STEP_KEYS: StepKey[] = [
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
  "startup_stage",
];

const PRODUCT_TYPES: ProductType[] = ["mobile", "web", "both", "other"];
const STAGES: StartupStage[] = ["idea", "validation", "pre-mvp", "mvp", "early-traction", "growth"];
const PRICING_MODELS: PricingModel[] = [
  "free",
  "freemium",
  "subscription",
  "one_time",
  "usage_based",
  "marketplace",
  "enterprise",
];
const INDUSTRY_IDS: IndustryId[] = [
  "edtech",
  "fintech",
  "health",
  "ecommerce",
  "saas",
  "marketplace",
  "creator",
  "other",
];

function normalizeString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((item) => normalizeString(item)).filter(Boolean))];
}

function asProductType(v: unknown): ProductType {
  return PRODUCT_TYPES.includes(v as ProductType) ? (v as ProductType) : "other";
}

function asStartupStage(v: unknown): StartupStage {
  return STAGES.includes(v as StartupStage) ? (v as StartupStage) : "idea";
}

function mapIndustryTextToId(industry: string): IndustryId {
  const lower = industry.toLowerCase();
  if (lower.includes("fintech") || lower.includes("finance") || lower.includes("bank") || lower.includes("payments")) return "fintech";
  if (lower.includes("health") || lower.includes("medical") || lower.includes("clinic") || lower.includes("patient")) return "health";
  if (lower.includes("ecom") || lower.includes("retail") || lower.includes("shopping") || lower.includes("d2c")) return "ecommerce";
  if (lower.includes("saas") || lower.includes("software") || lower.includes("b2b")) return "saas";
  if (lower.includes("marketplace") || lower.includes("two-sided") || lower.includes("buyer") || lower.includes("seller")) return "marketplace";
  if (lower.includes("creator") || lower.includes("content") || lower.includes("influencer")) return "creator";
  if (lower.includes("edtech") || lower.includes("education") || lower.includes("learning") || lower.includes("student")) return "edtech";
  return "other";
}

function normalizeIndustry(v: unknown): IndustryValue {
  if (v && typeof v === "object") {
    const candidate = v as { industry?: unknown; other?: unknown };
    const id = normalizeString(candidate.industry);
    if (INDUSTRY_IDS.includes(id as IndustryId)) {
      return {
        industry: id as IndustryId,
        other: normalizeString(candidate.other),
      };
    }
  }

  const text = normalizeString(v);
  if (!text) return { industry: null, other: "" };

  const mapped = mapIndustryTextToId(text);
  if (mapped === "other") {
    return { industry: "other", other: text };
  }

  return { industry: mapped, other: "" };
}

function normalizePricingModel(v: unknown): PricingModelValue {
  if (v && typeof v === "object") {
    const candidate = v as { pricingModels?: unknown; estimatedPrice?: unknown };
    const models = normalizeStringArray(candidate.pricingModels).filter((m) => PRICING_MODELS.includes(m as PricingModel)) as PricingModel[];
    return {
      pricingModels: models.length ? models : ["freemium"],
      estimatedPrice: normalizeString(candidate.estimatedPrice) || null,
    };
  }

  return {
    pricingModels: ["freemium"],
    estimatedPrice: null,
  };
}

export function normalizeUrlOnboardingDraft(input: Partial<UrlOnboardingDraft> | Record<string, unknown>): UrlOnboardingDraft {
  const idea = normalizeString(input.idea) || "This company is building a product that solves a meaningful customer problem.";
  const problem = normalizeString(input.problem) || "Customers currently rely on slower, manual alternatives and experience inefficiency.";
  const targetCustomer = normalizeString(input.target_customer) || "The target customer is users who need faster, simpler outcomes in this problem area.";
  const features = normalizeStringArray(input.features);
  const competitors = normalizeStringArray(input.competitors);
  const alternatives = normalizeStringArray(input.alternatives);

  return {
    idea,
    product_type: asProductType(input.product_type),
    features: features.length ? features : ["Streamlined workflow", "Faster execution", "Improved user visibility"],
    problem,
    target_customer: targetCustomer,
    industry: normalizeIndustry(input.industry),
    competitors,
    alternatives,
    pricing_model: normalizePricingModel(input.pricing_model),
    interview_count: "0",
    startup_stage: asStartupStage(input.startup_stage),
  };
}

export function serializeStepValue(stepKey: StepKey, draft: UrlOnboardingDraft): string {
  switch (stepKey) {
    case "features":
    case "competitors":
    case "alternatives":
      return JSON.stringify(draft[stepKey]);
    case "industry":
      return JSON.stringify(draft.industry);
    case "pricing_model":
      return JSON.stringify(draft.pricing_model);
    case "interview_count":
      return draft.interview_count;
    case "idea":
    case "product_type":
    case "problem":
    case "target_customer":
    case "startup_stage":
      return String(draft[stepKey]);
    default:
      return "";
  }
}

export type ExtractedUrlOnboardingModelOutput = {
  idea: string;
  product_type: "mobile" | "web" | "both" | "other";
  features: string[];
  problem: string;
  target_customer: string;
  industry: string;
  competitors: string[];
  alternatives: string[];
  pricing_models: Array<"subscription" | "one-time" | "freemium" | "usage-based">;
  startup_stage: StartupStage;
};

export function mapExtractedModelOutputToDraft(output: ExtractedUrlOnboardingModelOutput): UrlOnboardingDraft {
  const pricingModels: PricingModel[] = output.pricing_models
    .map((m) => {
      if (m === "one-time") return "one_time";
      if (m === "usage-based") return "usage_based";
      return m;
    });

  return normalizeUrlOnboardingDraft({
    idea: output.idea,
    product_type: output.product_type,
    features: output.features,
    problem: output.problem,
    target_customer: output.target_customer,
    industry: output.industry,
    competitors: output.competitors,
    alternatives: output.alternatives,
    pricing_model: {
      pricingModels: pricingModels.length ? pricingModels : ["freemium"],
      estimatedPrice: null,
    },
    startup_stage: output.startup_stage,
    interview_count: "0",
  });
}

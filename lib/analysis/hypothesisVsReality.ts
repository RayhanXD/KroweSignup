import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "@/lib/openai/extractResponseText";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export type AnalysisInput = {
  onboarding: {
    idea: string;
    problem: string;
    target_customer: string;
    features: string[];
  };
  interviewData: {
    topProblem: string;
    problemClusters: string[];
    supportingQuotes: string[];
    featureSpecs: string[];
    reasoning: string[];
    directCompetitors?: string[];
    onlineWorkarounds?: string[];
    alternativesUsed?: string[];
    businessProfileContext?: string[];
  };
};

export type AnalysisResult = {
  decision: "proceed" | "refine" | "pivot" | "rethink";
  confidence: number;
  breakdown: {
    problemMatch: {
      status: "strong_match" | "partial_match" | "mismatch";
      reasoning: string;
      hypothesisSummary?: string;
      realitySummary?: string;
    };
    featureRelevance: {
      relevant: string[];
      missing: string[];
      unnecessary: string[];
    };
    customerAlignment: {
      status: "aligned" | "partially_aligned" | "misaligned";
      reasoning: string;
      hypothesisSummary?: string;
      realitySummary?: string;
    };
    insightStrength: "weak" | "moderate" | "strong";
  };
  recommendation: string[];
};

export type QuoteSlim = {
  text: string;
  interview_id: string;
};

export type FeatureSpecSlim = {
  name: string;
  description: string;
  priority: string;
};

export type AnalysisContext = {
  founderProblem: string;
  founderCustomer: string;
  founderFeatures: string[];
  topProblem: string;
  topQuotes: QuoteSlim[];
  customerInsight: string;
  featureSpecs: FeatureSpecSlim[];
};

export type SignalStrengthMetrics = {
  interviewCount: number;
  uniqueInterviewees: number;
  consistencyScore: number;
  avgIntensity: number;
  frequency: number;
  clusterScore: number;
};

export type AnalysisResponse = AnalysisResult & {
  context: AnalysisContext;
  signalMetrics: SignalStrengthMetrics | null;
};

export function buildAnalysisPrompt(input: AnalysisInput): string {
  const { onboarding, interviewData } = input;
  return [
    "You are an expert product decision analyst.",
    "Evaluate whether a founder's idea holds up against real user interview data.",
    "",
    "HYPOTHESIS (founder believes):",
    `- Idea: ${onboarding.idea}`,
    `- Problem: ${onboarding.problem}`,
    `- Target customer: ${onboarding.target_customer}`,
    `- Planned features: ${onboarding.features.join(", ") || "none listed"}`,
    "",
    "REALITY (what users said):",
    `- Top problem: ${interviewData.topProblem}`,
    `- Problem clusters: ${interviewData.problemClusters.join("; ") || "none"}`,
    `- Supporting quotes: ${interviewData.supportingQuotes.map((q) => `"${q}"`).join(" | ") || "none"}`,
    `- Derived feature specs: ${interviewData.featureSpecs.join(", ") || "none"}`,
    `- Direct competitors: ${interviewData.directCompetitors?.join(", ") || "none"}`,
    `- Online workarounds (not direct competitors): ${interviewData.onlineWorkarounds?.join(", ") || "none"}`,
    `- Manual alternatives used/tried: ${interviewData.alternativesUsed?.join(", ") || "none"}`,
    `- Business profile context: ${interviewData.businessProfileContext?.join(" | ") || "none"}`,
    "",
    "Tasks:",
    "1. Compare founder problem vs real problems",
    "2. Evaluate planned features vs real needs",
    "3. Identify missing or unnecessary features",
    "4. Evaluate target customer match",
    "5. Assess interview signal strength",
    "",
    "Be brutally honest. Do not validate unless clearly aligned with user evidence.",
  ].join("\n");
}

function computeVerdict(breakdown: AnalysisResult["breakdown"]): {
  decision: AnalysisResult["decision"];
  confidence: number;
} {
  const problemScore =
    breakdown.problemMatch.status === "strong_match"
      ? 3
      : breakdown.problemMatch.status === "partial_match"
        ? 1
        : 0;
  const customerScore =
    breakdown.customerAlignment.status === "aligned"
      ? 2
      : breakdown.customerAlignment.status === "partially_aligned"
        ? 1
        : 0;
  const insightScore =
    breakdown.insightStrength === "strong"
      ? 2
      : breakdown.insightStrength === "moderate"
        ? 1
        : 0;

  const score = problemScore + customerScore + insightScore;
  const confidence = score / 7;
  const decision: AnalysisResult["decision"] =
    score >= 6 ? "proceed" : score >= 4 ? "refine" : score >= 2 ? "pivot" : "rethink";

  return { decision, confidence };
}

export async function analyzeHypothesisVsReality(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const userPrompt = buildAnalysisPrompt(input);

  const resp = await client.responses.create({
    model: "gpt-5.4-mini",
    temperature: 0,
    input: [
      {
        role: "system",
        content:
          "You are an expert product decision analyst. Return structured JSON only. Be direct and terse. For reasoning fields: 1–2 sentences max, under 30 words. For hypothesisSummary and realitySummary fields: ≤15 words each, plain declarative sentence, no filler.",
      },
      { role: "user", content: userPrompt },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "hypothesis_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            breakdown: {
              type: "object",
              additionalProperties: false,
              properties: {
                problemMatch: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    status: {
                      type: "string",
                      enum: ["strong_match", "partial_match", "mismatch"],
                    },
                    reasoning: { type: "string" },
                    hypothesisSummary: { type: "string" },
                    realitySummary: { type: "string" },
                  },
                  required: ["status", "reasoning", "hypothesisSummary", "realitySummary"],
                },
                featureRelevance: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    relevant: { type: "array", items: { type: "string" } },
                    missing: { type: "array", items: { type: "string" } },
                    unnecessary: { type: "array", items: { type: "string" } },
                  },
                  required: ["relevant", "missing", "unnecessary"],
                },
                customerAlignment: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    status: {
                      type: "string",
                      enum: ["aligned", "partially_aligned", "misaligned"],
                    },
                    reasoning: { type: "string" },
                    hypothesisSummary: { type: "string" },
                    realitySummary: { type: "string" },
                  },
                  required: ["status", "reasoning", "hypothesisSummary", "realitySummary"],
                },
                insightStrength: {
                  type: "string",
                  enum: ["weak", "moderate", "strong"],
                },
              },
              required: [
                "problemMatch",
                "featureRelevance",
                "customerAlignment",
                "insightStrength",
              ],
            },
            recommendation: { type: "array", items: { type: "string" } },
          },
          required: ["breakdown", "recommendation"],
        },
      },
    },
  });

  const raw = extractResponseText(resp);
  if (!raw) throw new Error("analyzeHypothesisVsReality: empty model output");

  const parsed = JSON.parse(raw) as Pick<AnalysisResult, "breakdown" | "recommendation">;
  const { decision, confidence } = computeVerdict(parsed.breakdown);

  return { ...parsed, decision, confidence };
}

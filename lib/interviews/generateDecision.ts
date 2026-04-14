import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "@/lib/openai/extractResponseText";
import type { ProblemCluster, DecisionOutput, FeatureSpec, UserFlow, EdgeCase, SuccessMetric } from "./types";
import type { OnboardingData, AssumptionVsEvidenceReport, AssumptionAnalysis } from "@/lib/analysis/assumptionMatching";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

type GenerateDecisionParams = {
  cluster: ProblemCluster & { id: string };
  allClusters: Array<ProblemCluster & { id: string }>;
  founderContext: {
    idea: string | null;
    problem: string | null;
    targetCustomer: string | null;
    industry: string | null;
  } | null;
  onboarding?: OnboardingData;
  assumptionAnalysis?: AssumptionVsEvidenceReport | null;
  featureValidation?: {
    mustBuild: string[];
    irrelevant: string[];
    missing: string[];
  } | null;
  directCompetitors?: string[];
  onlineWorkarounds?: string[];
  alternativesUsed?: string[];
  businessProfileContext?: string[];
  confidenceScore?: number;
  confidenceLevel?: "LOW" | "MEDIUM" | "HIGH";
};

type GenerateDecisionResult = Omit<
  DecisionOutput,
  "project_id" | "selected_cluster_id" | "status" | "created_at"
>;

function formatAlignment(a: AssumptionAnalysis): string {
  return `${a.assumptionText} → ${a.alignment} (similarity: ${a.bestSimilarity.toFixed(2)})`;
}

export async function generateDecision(
  params: GenerateDecisionParams
): Promise<GenerateDecisionResult> {
  const {
    cluster,
    allClusters,
    founderContext,
    onboarding,
    assumptionAnalysis,
    featureValidation,
    directCompetitors,
    onlineWorkarounds,
    alternativesUsed,
    businessProfileContext,
    confidenceScore,
    confidenceLevel,
  } = params;

  const systemPrompt = [
    "You are a senior product strategist. Generate a complete product specification grounded in real user data.",
    "For the reasoning field, return 3–5 short bullet-point strings (no bullet characters) — each under 15 words, terse and direct.",
    confidenceLevel === "LOW"
      ? "IMPORTANT: Confidence is LOW. Do NOT present a strong recommendation. Highlight uncertainty and suggest more interviews in your reasoning."
      : confidenceLevel === "HIGH"
      ? "IMPORTANT: Confidence is HIGH. Be decisive. Recommend exact features to build based on the evidence."
      : null,
  ].filter(Boolean).join(" ");

  const runnerUps = allClusters
    .filter((c) => c.id !== cluster.id)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => `- ${c.canonical_problem} (score: ${c.score.toFixed(2)}, freq: ${c.frequency})`);

  const quotesText = cluster.supporting_quotes
    .slice(0, 5)
    .map((q, i) => `Quote ${i + 1}: "${q.text}"`)
    .join("\n");

  const founderText = founderContext
    ? [
        founderContext.idea ? `Idea: ${founderContext.idea}` : null,
        founderContext.problem ? `Problem: ${founderContext.problem}` : null,
        founderContext.targetCustomer ? `Target Customer: ${founderContext.targetCustomer}` : null,
        founderContext.industry ? `Industry: ${founderContext.industry}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  const assumptionsText = onboarding
    ? [
        "FOUNDER ASSUMPTIONS:",
        onboarding.problem ? `- Problem: ${onboarding.problem}` : null,
        onboarding.target_customer ? `- Target Customer: ${onboarding.target_customer}` : null,
        onboarding.features ? `- Features: ${onboarding.features}` : null,
        onboarding.competitors ? `- Competitors: ${onboarding.competitors}` : null,
        onboarding.alternatives ? `- Alternatives: ${onboarding.alternatives}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  const validationText = assumptionAnalysis
    ? [
        "ASSUMPTION VALIDATION:",
        `- Problem: ${formatAlignment(assumptionAnalysis.problem)}`,
        `- Target Customer: ${formatAlignment(assumptionAnalysis.targetCustomer)}`,
        assumptionAnalysis.features.length > 0
          ? `- Features: ${assumptionAnalysis.features.map(formatAlignment).join("; ")}`
          : null,
        assumptionAnalysis.competitors?.length
          ? `- Competitors: ${assumptionAnalysis.competitors.map(formatAlignment).join("; ")}`
          : null,
        assumptionAnalysis.alternatives?.length
          ? `- Alternatives: ${assumptionAnalysis.alternatives.map(formatAlignment).join("; ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  const featureText = featureValidation
    ? [
        "FEATURE VALIDATION:",
        `Must Build:\n${(featureValidation.mustBuild || []).map(f => `- ${f}`).join("\n") || "None"}`,
        `Irrelevant:\n${(featureValidation.irrelevant || []).map(f => `- ${f}`).join("\n") || "None"}`,
        `Missing:\n${(featureValidation.missing || []).map(f => `- ${f}`).join("\n") || "None"}`,
      ].join("\n")
    : null;

  const confidenceText = confidenceLevel
    ? [
        "DECISION CONFIDENCE:",
        `Level: ${confidenceLevel}`,
        `Score: ${confidenceScore?.toFixed(2)}`,
        "",
        "Interpretation:",
        "- LOW → Not enough signal; surface uncertainty and recommend more interviews",
        "- MEDIUM → Some signal, but hedged; acknowledge gaps",
        "- HIGH → Strong consistent signal; be decisive and specific",
      ].join("\n")
    : null;

  const transcriptAlternativesText =
    (directCompetitors && directCompetitors.length > 0) ||
    (onlineWorkarounds && onlineWorkarounds.length > 0) ||
    (alternativesUsed && alternativesUsed.length > 0)
      ? [
          "TRANSCRIPT-DERIVED TOOL LANDSCAPE:",
          `Direct competitors (same product category as founder's idea):\n${(directCompetitors ?? []).map((m) => `- ${m}`).join("\n") || "None"}`,
          `Online workarounds (used because no ideal solution exists — not direct competition):\n${(onlineWorkarounds ?? []).map((m) => `- ${m}`).join("\n") || "None"}`,
          `Manual alternatives (spreadsheets, DMs, notes, etc.):\n${(alternativesUsed ?? []).map((a) => `- ${a}`).join("\n") || "None"}`,
        ].join("\n")
      : null;

  const businessProfileText =
    businessProfileContext && businessProfileContext.length > 0
      ? [
          "BUSINESS PROFILE CONTEXT:",
          ...businessProfileContext.map((line) => `- ${line}`),
        ].join("\n")
      : null;

  const userPrompt = [
    `TOP PROBLEM: ${cluster.canonical_problem}`,
    `Score: ${cluster.score.toFixed(2)} | Frequency: ${cluster.frequency} | Avg Intensity: ${cluster.avg_intensity.toFixed(1)}/5 | Consistency: ${cluster.consistency_score.toFixed(2)}`,
    "",
    "Supporting Quotes:",
    quotesText,
    "",
    runnerUps.length > 0 ? `Runner-up problems:\n${runnerUps.join("\n")}` : null,
    founderText ? `\nFounder Context:\n${founderText}` : null,
    assumptionsText ? `\n${assumptionsText}` : null,
    validationText ? `\n${validationText}` : null,
    featureText ? `\n${featureText}` : null,
    transcriptAlternativesText ? `\n${transcriptAlternativesText}` : null,
    businessProfileText ? `\n${businessProfileText}` : null,
    confidenceText ? `\n${confidenceText}` : null,
  ]
    .filter((x) => x !== null)
    .join("\n");

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await client.responses.create({
        model: "gpt-5.4-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "decision_output",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                reasoning: { type: "array", items: { type: "string" } },
                confidence_score: { type: "number" },
                feature_specs: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      priority: {
                        type: "string",
                        enum: ["must-have", "should-have", "nice-to-have"],
                      },
                    },
                    required: ["name", "description", "priority"],
                  },
                },
                user_flows: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      steps: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "steps"],
                  },
                },
                edge_cases: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      scenario: { type: "string" },
                      mitigation: { type: "string" },
                    },
                    required: ["scenario", "mitigation"],
                  },
                },
                success_metrics: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      metric: { type: "string" },
                      target: { type: "string" },
                      rationale: { type: "string" },
                    },
                    required: ["metric", "target", "rationale"],
                  },
                },
              },
              required: [
                "reasoning",
                "confidence_score",
                "feature_specs",
                "user_flows",
                "edge_cases",
                "success_metrics",
              ],
            },
          },
        },
      });

      const raw = extractResponseText(resp);
      if (!raw) {
        lastError = new Error("generateDecision: empty model output");
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw lastError;
      }

      const parsed = JSON.parse(raw) as {
        reasoning: string[];
        confidence_score: number;
        feature_specs: FeatureSpec[];
        user_flows: UserFlow[];
        edge_cases: EdgeCase[];
        success_metrics: SuccessMetric[];
      };

      return parsed;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const isRetriable =
        lastError.message.includes("empty model output") ||
        lastError.message.includes("JSON");

      if (isRetriable && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("generateDecision: failed after retries");
}

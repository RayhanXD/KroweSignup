import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "./marketSizeUtils";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export type MvpCostEstimate = {
  cost_low_usd: number;
  cost_high_usd: number;
  cost_mid_usd: number;
  cost_efficiency_score_0_1: number; // higher = cheaper/easier to build
  confidence_0_1: number;
  key_cost_drivers: string[];
  recommended_mvp_scope: string;
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export async function estimateMvpCostViaLLM(args: {
  idea: string;
  industry?: string | null;
  productType?: string | null;
  targetCustomer?: string | null;
  teamSize?: number | null;
  hoursPerWeek?: number | null;
}): Promise<MvpCostEstimate> {
  const systemPrompt =
    "You estimate MVP build cost for a startup's FIRST version. " +
    "Goal: realistic, founder-optimistic estimate to build + launch a DEMO-QUALITY, SELLABLE MVP (core problem only) in 4–8 weeks. " +
    "Include: engineering + minimal design, managed tooling/infra (hosting, auth, APIs, DB, analytics), early ops (domain, email, basic SaaS). " +
    "Constraints: No freelancers/agencies; founder time is FREE; prefer managed + lowest-cost options; no AI unless required; legal only if needed (fintech/health). " +
    "Scores: cost_efficiency_score_0_1 (1=cheap/simple → 0=expensive), confidence_0_1 (reliability). " +
    "Output: Return ONLY valid JSON. USD integers only. key_cost_drivers: 3–5 items, each 5–10 words max. recommended_mvp_scope: 1–2 sentences max. cost_low_usd < cost_mid_usd < cost_high_usd.";

  const userPrompt = [
    "Inputs:",
    `Idea: ${args.idea}`,
    `Industry: ${args.industry ?? "unknown"}`,
    `ProductType: ${args.productType ?? "unknown"} (web/mobile/both/other)`,
    `TargetCustomer: ${args.targetCustomer ?? "unknown"}`,
    `TeamSize: ${args.teamSize ?? "unknown"}`,
    `HoursPerWeek: ${args.hoursPerWeek ?? "unknown"}`,
  ].join("\n");

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
            name: "mvp_cost_estimate",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                cost_low_usd: { type: "number" },
                cost_high_usd: { type: "number" },
                cost_mid_usd: { type: "number" },
                cost_efficiency_score_0_1: { type: "number" },
                confidence_0_1: { type: "number" },
                key_cost_drivers: { type: "array", items: { type: "string" } },
                recommended_mvp_scope: { type: "string" },
              },
              required: [
                "cost_low_usd",
                "cost_high_usd",
                "cost_mid_usd",
                "cost_efficiency_score_0_1",
                "confidence_0_1",
                "key_cost_drivers",
                "recommended_mvp_scope",
              ],
            },
          },
        },
      });

      const raw = extractResponseText(resp);
      if (!raw) {
        lastError = new Error("MVP cost: empty model output");
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw lastError;
      }

      const parsed = JSON.parse(raw);

      return {
        ...parsed,
        cost_efficiency_score_0_1: clamp01(parsed.cost_efficiency_score_0_1),
        confidence_0_1: clamp01(parsed.confidence_0_1),
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const isRetriable =
        lastError.message.includes("empty model output") ||
        lastError.message.includes("Unexpected end of JSON input") ||
        lastError.message.includes("JSON");

      if (isRetriable && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("MVP cost: failed after retries");
}

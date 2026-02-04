import OpenAI from "openai";
import { ENV } from "../env";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export type MvpCostEstimate = {
  cost_low_usd: number;
  cost_high_usd: number;
  cost_mid_usd: number;
  cost_efficiency_score_0_1: number; // higher = cheaper/easier to build
  confidence_0_1: number;
  assumptions: string[];
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
  const prompt = `
You are estimating MVP build cost for a FIRST VERSION of a startup.

Inputs:
- Idea: ${args.idea}
- Industry: ${args.industry ?? "unknown"}
- Product type: ${args.productType ?? "unknown"} (web/mobile/both/other)
- Target customer: ${args.targetCustomer ?? "unknown"}
- Team size: ${args.teamSize ?? "unknown"}
- Hours per week: ${args.hoursPerWeek ?? "unknown"}

Your goal:
Produce a realistic but founder-optimistic cost estimate for building and launching a DEMO-QUALITY, SELLABLE MVP that solves the user’s core problem.

Cost scope (included):
- Build cost (engineering + minimal design)
- Tooling & infra (hosting, auth, APIs, databases, analytics)
- Early ops (domain, email, basic SaaS subscriptions)

Strict constraints:
- NEVER assume freelancers, agencies, or paid contractors.
- If skills are missing, assume the founder finds a cofounder instead of hiring.
- Use managed services and lowest-cost alternatives wherever possible.
- Avoid custom infrastructure unless absolutely required.
- Assume no AI usage unless the idea explicitly requires it.
- Only include legal costs if the startup CANNOT operate without them
  (e.g. legaltech, fintech, healthcare, regulated products).
- Avoid high-cost tooling unless unavoidable.
-NEVER assume founders time into the cost estimate assume their time is free.

MVP definition:
- Demo-quality but sellable
- Can be shown to users or early customers
- Solves the core problem, not feature-complete

Time horizon:
- Assume a 4–8 week MVP build.

Estimation bias:
- Founder-optimistic but still plausible
- Lower bounds should feel achievable by a focused team
- Midpoint should reflect realistic execution with discipline

Scoring rules:
- cost_efficiency_score_0_1:
  - 1.0 = extremely cheap and fast to build (simple web app, few integrations)
  - 0.0 = structurally expensive (hardware, heavy regulation, complex infra)
- confidence_0_1 reflects how reliable the estimate is given the inputs

Output rules:
- Return ONLY valid JSON matching the schema.
- All USD values must be integers.
- cost_low_usd < cost_mid_usd < cost_high_usd
- Keep assumptions concise and practical.
`;

  const resp = await client.responses.create({
    model: "gpt-5-nano",
    input: prompt,
    // ✅ Structured Outputs in Responses API uses text.format :contentReference[oaicite:1]{index=1}
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
            assumptions: { type: "array", items: { type: "string" } },
            key_cost_drivers: { type: "array", items: { type: "string" } },
            recommended_mvp_scope: { type: "string" },
          },
          required: [
            "cost_low_usd",
            "cost_high_usd",
            "cost_mid_usd",
            "cost_efficiency_score_0_1",
            "confidence_0_1",
            "assumptions",
            "key_cost_drivers",
            "recommended_mvp_scope",
          ],
        },
      },
    },
  });

  // With strict schema, output_text will be valid JSON for this schema.
  const parsed = JSON.parse(resp.output_text);

  // sanitize
  return {
    ...parsed,
    cost_efficiency_score_0_1: clamp01(parsed.cost_efficiency_score_0_1),
    confidence_0_1: clamp01(parsed.confidence_0_1),
  };
}

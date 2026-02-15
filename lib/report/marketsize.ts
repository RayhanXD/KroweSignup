import OpenAI from "openai";
import { ENV } from "../env";

const openai = new OpenAI({
    apiKey: ENV.OPENAI_API_KEY,
});

export type MarketSizeLLM = {
    planning_market_size_usd_range: { low: number; high: number; unit: "USD/year" };
    tam_usd_range: { low: number; high: number; unit: "USD/year" };
    sam_usd_range: { low: number; high: number; unit: "USD/year" };
    initial_wedge_usd_range: { low: number; high: number; unit: "USD/year" };
};

function isUsdYearRange(value: unknown): value is { low: number; high: number; unit: "USD/year" } {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.low === "number" &&
        typeof candidate.high === "number" &&
        candidate.unit === "USD/year"
    );
}

function extractResponseText(response: unknown): string{
    const candidate = response as {
        output_text?: unknown;
        output?: Array<{ content?: Array<{ text?: unknown }> }>;
    };

    //path used for response
    if (typeof candidate?.output_text === "string" && candidate.output_text.trim()){
        return candidate.output_text.trim();
    }

    //fallback try to pull text from output content
    const out = candidate?.output;
    if(Array.isArray(out)) {
        for (const item of out ) {
            const content = item?.content;
            if(Array.isArray(content)){
                for (const c of content) {
                    const t = c?.text;
                    if(typeof t === "string" && t.trim()) return t.trim();
                }
            }
        }
    }
    return "";
}

function isValidMarketSize(x: unknown): x is MarketSizeLLM {
  if (!x || typeof x !== "object") return false;
  const candidate = x as Record<string, unknown>;

  return (
    isUsdYearRange(candidate.planning_market_size_usd_range) &&
    isUsdYearRange(candidate.tam_usd_range) &&
    isUsdYearRange(candidate.sam_usd_range) &&
    isUsdYearRange(candidate.initial_wedge_usd_range)
  );
}

export async function estimateMarketSizeLLM(input: {
    idea: string | null;
    problem: string | null;
    targetCustomer: string | null;
    industry: string | null;
    competitors: { name: string; link?: string }[];
}): Promise<MarketSizeLLM | null> {
    const payload = {
        idea: input.idea ?? "missing",
        problem: input.problem ?? "missing",
        targetCustomer: input.targetCustomer ?? "missing",
        industry: input.industry ?? "missing",
        competitors: (input.competitors ?? []).slice(0, 6).map((c) => c.name)
    };

    const response = await openai.responses.create({
        model: "gpt-5-nano",
        input: [
            {
                role: "system",
                content:
               "You are a market-sizing analyst for early-stage startups." +
                "Goal:"+
                "Estimate realistic market size ranges in USD/year for:"+
                    "- Planning Market Size (realistic first-year reachable revenue range)"+
                    "- TAM (total addressable market, global)"+
                    "- SAM (serviceable available market: reachable in the next 12–24 months)"+
                    "- Initial Wedge (the first narrow beachhead niche you can actually win)"+
                    "Hard rules:"+
                    "- Avoid fake precision. Use broad ranges (ex: $200M–$800M), not single numbers."+
                   " -make sure ranges are logically consistent (Planning <= Initial Wedge <= SAM <= TAM)."+
                   " - If critical details are missing, make conservative assumptions."+
                   " - Prefer bottom-up logic (users × $/year) when possible; otherwise use proxy spend logic."+
                   " - Do NOT browse the web. Do NOT cite external sources. This is a modeled estimate."+
                   "when consider pricing keep in mind of users busienss type (b2b or b2c) where b2b have higher pricing than b2c"+
                   "keep in my user product type since most often itll be a subscription based product"+
                    "Output format:"+
                    "Return ONLY valid JSON matching this schema (no markdown, no commentary outside JSON)",
            },
            {
                role: "user",
                content:
                "Estimate market size for this startup with only these outputs:" +
                "- planning_market_size_usd_range"+
                "- tam_usd_range"+
                "- sam_usd_range"+
                "- initial_wedge_usd_range"+
                "- consider that the user is launching an MVP in year 1 and likely a subscription product"+
                "Use USD/year ranges and conservative assumptions if details are missing."+
                "Return ONLY valid JSON matching the schema from the system prompt.\n\n"+
                "Inputs:"+ JSON.stringify(payload, null, 2),
            },
        ],
        //strucutred outpts (JSON Schema) via txt.format
        text: {
            format: {
                type: "json_schema",
                name: "market_size",
                strict: true,
                schema: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                        "planning_market_size_usd_range",
                        "tam_usd_range",
                        "sam_usd_range",
                        "initial_wedge_usd_range",
                    ],
                    properties: {
                        planning_market_size_usd_range: {
                            type: "object",
                            additionalProperties: false,
                            required: ["low", "high", "unit"],
                            properties: {
                                low: { type: "number" },
                                high: { type: "number" },
                                unit: { type: "string", enum: ["USD/year"] },
                            },
                        },
                        tam_usd_range: {
                            type: "object",
                            additionalProperties: false,
                            required: ["low", "high", "unit"],
                            properties: {
                                low: { type: "number" },
                                high: { type: "number" },
                                unit: { type: "string", enum: ["USD/year"] },
                            },
                        },
                        sam_usd_range: {
                            type: "object",
                            additionalProperties: false,
                            required: ["low", "high", "unit"],
                            properties: {
                                low: { type: "number" },
                                high: { type: "number" },
                                unit: { type: "string", enum: ["USD/year"] },
                            },
                        },
                        initial_wedge_usd_range: {
                            type: "object",
                            additionalProperties: false,
                            required: ["low", "high", "unit"],
                            properties: {
                                low: { type: "number" },
                                high: { type: "number" },
                                unit: { type: "string", enum: ["USD/year"] },
                            },
                        },
                    },
                },
            },
        },
        //put token cap here if still doesnt work
    });

    const raw = extractResponseText(response);
    console.log("MARKET_SIZE_RAW:", raw);


    if(!raw){
        console.warn("market size: empty model output, full response:", response);
        return null;
    }

    try {
        const parsed = JSON.parse(raw);

        // Validation: ensure critical fields exist
        if (!isValidMarketSize(parsed)) {
            console.warn("Market size: schema mismatch. Raw:", raw);
            return null;
        }

        return parsed;
    } catch {
        console.error("Failed to parse market size LLM response:", raw);
        return null;
    }
}

import OpenAI from "openai";
import { ENV } from "../env";

const openai = new OpenAI({
    apiKey: ENV.OPENAI_API_KEY,
});

export type MarketSizeLLM = {
    market_definition: string;
    tam_usd_range: { low: number; high: number; unit: "USD/year" };
    sam_usd_range: { low: number; high: number; unit: "USD/year" };
    wedge_sam_usd_range: { low: number; high: number; unit: "USD/year" };
    planning_year_1: {
        target_revenue_usd: { low: number; high: number };
        customer_count: { low: number; high: number };
        implied_arpa_usd: { low: number; high: number };
    };
    key_assumptions: string[];
    confidence: number; // 0–1
    notes: string[];
};

function extractResponseText(response: any): string{
    //path used for response
    if (typeof response?.output_text === "string" && response.output_text.trim()){
        return response.output_text.trim();
    }

    //fallback try to pull text from output content
    const out = response?.output;
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

function isValidMarketSize(x: any): x is MarketSizeLLM {
  return (
    typeof x?.market_definition === "string" &&
    typeof x?.tam_usd_range?.low === "number" &&
    typeof x?.tam_usd_range?.high === "number" &&
    x?.tam_usd_range?.unit === "USD/year" &&
    typeof x?.sam_usd_range?.low === "number" &&
    typeof x?.sam_usd_range?.high === "number" &&
    x?.sam_usd_range?.unit === "USD/year" &&
    typeof x?.wedge_sam_usd_range?.low === "number" &&
    typeof x?.wedge_sam_usd_range?.high === "number" &&
    x?.wedge_sam_usd_range?.unit === "USD/year" &&
    typeof x?.planning_year_1?.target_revenue_usd?.low === "number" &&
    typeof x?.planning_year_1?.target_revenue_usd?.high === "number" &&
    typeof x?.planning_year_1?.customer_count?.low === "number" &&
    typeof x?.planning_year_1?.customer_count?.high === "number" &&
    typeof x?.planning_year_1?.implied_arpa_usd?.low === "number" &&
    typeof x?.planning_year_1?.implied_arpa_usd?.high === "number" &&
    Array.isArray(x?.key_assumptions) &&
    typeof x?.confidence === "number" &&
    Array.isArray(x?.notes)
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
        model: "gpt-4o-mini",
        input: [
            {
                role: "system",
                content:
               "You are a market-sizing analyst for early-stage startups." +
                "Goal:"+
                "Estimate realistic market size ranges in USD/year for:"+
                    "- TAM (total addressable market, global)"+
                    "- SAM (serviceable available market: reachable in the next 12–24 months)"+
                    "- Wedge-SAM (the first narrow beachhead niche you can actually win)"+
                    "Hard rules:"+
                    "- Avoid fake precision. Use broad ranges (ex: $200M–$800M), not single numbers."+
                   " - Show assumptions briefly (user count, ARPA/price, adoption rate, geography)."+
                   " - If critical details are missing, make conservative assumptions and explicitly label them."+
                   " - Prefer bottom-up logic (users × $/year) when possible; otherwise use proxy spend logic."+
                   " - Do NOT browse the web. Do NOT cite external sources. This is a modeled estimate."+
                    "Output format:"+
                    "Return ONLY valid JSON matching this schema (no markdown, no commentary outside JSON)",
            },
            {
                role: "user",
                content:
                "Estimate market size for this startup using TAM (global), SAM (reachable in 12–24 months), and Wedge-SAM (first narrow niche)." +
                "Also include:"+
                "- the user’s market definition (who/where/how they buy/pricing anchor),"+
                "- an initial wedge plan (beachhead + first use case + GTM motion + conversion target),"+
                "- a planning market size for Year 1 (target revenue + customer count)."+
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
                        "market_definition",
                        "tam_usd_range",
                        "sam_usd_range",
                        "wedge_sam_usd_range",
                        "planning_year_1",
                        "key_assumptions",
                        "confidence",
                        "notes",
                    ],
                    properties: {
                        market_definition: { type: "string" },
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
                        wedge_sam_usd_range: {
                            type: "object",
                            additionalProperties: false,
                            required: ["low", "high", "unit"],
                            properties: {
                                low: { type: "number" },
                                high: { type: "number" },
                                unit: { type: "string", enum: ["USD/year"] },
                            },
                        },
                        planning_year_1: {
                            type: "object",
                            additionalProperties: false,
                            required: ["target_revenue_usd", "customer_count", "implied_arpa_usd"],
                            properties: {
                                target_revenue_usd: {
                                    type: "object",
                                    additionalProperties: false,
                                    required: ["low", "high"],
                                    properties: {
                                        low: { type: "number" },
                                        high: { type: "number" },
                                    },
                                },
                                customer_count: {
                                    type: "object",
                                    additionalProperties: false,
                                    required: ["low", "high"],
                                    properties: {
                                        low: { type: "number" },
                                        high: { type: "number" },
                                    },
                                },
                            },
                        },
                        key_assumptions: { type: "array", items: { type: "string" } },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                        notes: { type: "array", items: { type: "string" } },
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
    } catch (e) {
        console.error("Failed to parse market size LLM response:", raw);
        return null;
    }
}
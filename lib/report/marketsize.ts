import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export type MarketSizeLLM = {
    market_definition: string;
    tam_usd_range: { low: number; high: number; unit: "USD/year" };
    sam_usd_range: { low: number; high: number; unit: "USD/year" };
    wedge_sam_usd_range: { low: number; high: number; unit: "USD/year" };
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
        model: "gpt-5-mini",
        input: [
            {
                role: "system",
                content:
                    "You are a market-sizing analyst. Produce realistic TAM/SAM/Wedge-SAM ranges in USD/year. " +
                    "Avoid fake precision: use broad ranges and state assumptions. " +
                    "If details are missing, make conservative assumptions and say so. " +
                    "Return ONLY valid JSON that matches the schema.",
            },
            {
                role: "user",
                content:
                    "Estimate market size for this startup. Output TAM (global), SAM (reachable initial market), " +
                    "and wedge-SAM (first narrow niche). Use USD/year ranges.\n\n" +
                    JSON.stringify(payload, null, 2),
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
import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText, nowMs } from "./marketSizeUtils";

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

export type MarketSizeLLM = {
  planning_market_size_usd_range: { low: number; high: number; unit: "USD/year" };
  tam_usd_range: { low: number; high: number; unit: "USD/year" };
  sam_usd_range: { low: number; high: number; unit: "USD/year" };
  initial_wedge_usd_range: { low: number; high: number; unit: "USD/year" };
};

export type MarketSizeTimings = {
  total_market_size_ms: number;
  prompt_build_ms: number;
  llm_request_ms: number;
  parse_ms: number;
  retries: number;
  cache_hit: boolean;
};

export type MarketSizeWithTimings = {
  result: MarketSizeLLM | null;
  timings: MarketSizeTimings;
};

function defaultTimings(): MarketSizeTimings {
  return {
    total_market_size_ms: 0,
    prompt_build_ms: 0,
    llm_request_ms: 0,
    parse_ms: 0,
    retries: 0,
    cache_hit: false,
  };
}

function isUsdYearRange(value: unknown): value is { low: number; high: number; unit: "USD/year" } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.low === "number" &&
    typeof candidate.high === "number" &&
    candidate.unit === "USD/year"
  );
}

function isValidMarketSize(value: unknown): value is MarketSizeLLM {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    isUsdYearRange(candidate.planning_market_size_usd_range) &&
    isUsdYearRange(candidate.tam_usd_range) &&
    isUsdYearRange(candidate.sam_usd_range) &&
    isUsdYearRange(candidate.initial_wedge_usd_range)
  );
}

export async function estimateMarketSizeLLMWithMetrics(input: {
  idea: string | null;
  problem: string | null;
  targetCustomer: string | null;
  industry: string | null;
  competitors: { name: string; link?: string }[];
}): Promise<MarketSizeWithTimings> {
  const totalStartedAt = nowMs();
  const timings = defaultTimings();

  const promptBuildStartedAt = nowMs();
  const payload = {
    idea: input.idea ?? "missing",
    problem: input.problem ?? "missing",
    targetCustomer: input.targetCustomer ?? "missing",
    industry: input.industry ?? "missing",
    competitors: (input.competitors ?? []).slice(0, 6).map((c) => c.name),
  };

  const systemPrompt =
    "You are a market-sizing analyst for early-stage startups." +
    "Goal: estimate realistic market size ranges in USD/year for planning market size, TAM, SAM, and initial wedge." +
    "Hard rules:" +
    "- Use broad ranges, not fake precision." +
    "- Keep logical consistency: Planning <= Initial Wedge <= SAM <= TAM." +
    "- If details are missing, make conservative assumptions." +
    "- Prefer bottom-up logic when possible." +
    "- Return only JSON (no markdown).";

  const userPrompt =
    "Estimate market size for this startup with only these outputs: planning_market_size_usd_range, tam_usd_range, sam_usd_range, initial_wedge_usd_range. " +
    "Use USD/year ranges and conservative assumptions. Inputs:\n" +
    JSON.stringify(payload, null, 2);

  timings.prompt_build_ms = Math.round(nowMs() - promptBuildStartedAt);

  const llmStartedAt = nowMs();
  const response = await openai.responses.create({
    model: "gpt-5.4-mini",
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "market_size_v1",
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
  });
  timings.llm_request_ms = Math.round(nowMs() - llmStartedAt);

  const parseStartedAt = nowMs();
  const raw = extractResponseText(response);

  if (!raw) {
    console.warn("[marketSize] V1 empty model output");
    timings.parse_ms = Math.round(nowMs() - parseStartedAt);
    timings.total_market_size_ms = Math.round(nowMs() - totalStartedAt);
    console.log(`[marketSize] prompt_build_ms=${timings.prompt_build_ms}`);
    console.log(`[marketSize] llm_request_ms=${timings.llm_request_ms}`);
    console.log(`[marketSize] parse_ms=${timings.parse_ms}`);
    console.log(`[marketSize] total_market_size_ms=${timings.total_market_size_ms}`);
    console.log(`[marketSize] retries=${timings.retries}`);
    return { result: null, timings };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isValidMarketSize(parsed)) {
      console.warn("[marketSize] V1 schema mismatch");
      timings.parse_ms = Math.round(nowMs() - parseStartedAt);
      timings.total_market_size_ms = Math.round(nowMs() - totalStartedAt);
      console.log(`[marketSize] prompt_build_ms=${timings.prompt_build_ms}`);
      console.log(`[marketSize] llm_request_ms=${timings.llm_request_ms}`);
      console.log(`[marketSize] parse_ms=${timings.parse_ms}`);
      console.log(`[marketSize] total_market_size_ms=${timings.total_market_size_ms}`);
      console.log(`[marketSize] retries=${timings.retries}`);
      return { result: null, timings };
    }

    timings.parse_ms = Math.round(nowMs() - parseStartedAt);
    timings.total_market_size_ms = Math.round(nowMs() - totalStartedAt);
    console.log(`[marketSize] prompt_build_ms=${timings.prompt_build_ms}`);
    console.log(`[marketSize] llm_request_ms=${timings.llm_request_ms}`);
    console.log(`[marketSize] parse_ms=${timings.parse_ms}`);
    console.log(`[marketSize] total_market_size_ms=${timings.total_market_size_ms}`);
    console.log(`[marketSize] retries=${timings.retries}`);

    return { result: parsed, timings };
  } catch {
    console.error("[marketSize] V1 parse failure");
    timings.parse_ms = Math.round(nowMs() - parseStartedAt);
    timings.total_market_size_ms = Math.round(nowMs() - totalStartedAt);
    console.log(`[marketSize] prompt_build_ms=${timings.prompt_build_ms}`);
    console.log(`[marketSize] llm_request_ms=${timings.llm_request_ms}`);
    console.log(`[marketSize] parse_ms=${timings.parse_ms}`);
    console.log(`[marketSize] total_market_size_ms=${timings.total_market_size_ms}`);
    console.log(`[marketSize] retries=${timings.retries}`);
    return { result: null, timings };
  }
}

export async function estimateMarketSizeLLM(input: {
  idea: string | null;
  problem: string | null;
  targetCustomer: string | null;
  industry: string | null;
  competitors: { name: string; link?: string }[];
}): Promise<MarketSizeLLM | null> {
  const { result } = await estimateMarketSizeLLMWithMetrics(input);
  return result;
}

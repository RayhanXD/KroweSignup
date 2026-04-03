import OpenAI from "openai";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import { ENV } from "../env";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });
const SHOULD_LOG_TOKEN_DEBUG =
  process.env.DEBUG_OPENAI_TOKENS === "true" &&
  process.env.NODE_ENV !== "production";
const PRIMARY_MODEL = "gpt-5.4-mini";
const VALIDATION_CONFIDENCE_THRESHOLD = 0.35;
const MAX_IDEA_CHARS = 260;
const MAX_LINE_CHARS = 120;
const MAX_WHY_CHARS = 180;
const COMPETITOR_COUNT = 3;

type PromptMessage = {
  role: "system" | "user";
  content: string;
};

type RawCompetitor = {
  name: string;
  url: string;
  why: string;
  confidence: number;
};

export type Competitor = {
  name: string;
  url: string;
  why_competitor: string;
  evidence: string; // short quote/paraphrase of what they do
  why?: string;
  confidence?: number;
};

function compactWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function firstTwoSentences(text: string): string {
  const normalized = compactWhitespace(text);
  if (!normalized) return "unknown";

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const candidate = sentences.slice(0, 2).join(" ");
  return truncate(candidate || normalized, MAX_IDEA_CHARS);
}

function firstSentence(text: string): string {
  const normalized = compactWhitespace(text);
  if (!normalized) return "No rationale provided.";

  const sentence = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .find(Boolean);

  return truncate(sentence || normalized, MAX_WHY_CHARS);
}

function normalizeLine(text: string | null | undefined, fallback = "unknown"): string {
  const normalized = compactWhitespace(text ?? "");
  if (!normalized) return fallback;
  return truncate(normalized, MAX_LINE_CHARS);
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function normalizeUrl(rawUrl: string): string {
  const value = compactWhitespace(rawUrl);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

// Keep this prompt intentionally small to avoid token bloat and latency spikes.
function buildMinimalCompetitorMessages(params: {
  idea: string;
  industry: string;
  productType?: string | null;
  targetCustomer?: string | null;
}): PromptMessage[] {
  const idea = firstTwoSentences(params.idea);
  const industry = normalizeLine(params.industry);
  const productType = normalizeLine(params.productType, "unknown");
  const targetCustomer = normalizeLine(params.targetCustomer, "unknown");

  return [
    {
      role: "system",
      content:
        "You are a competitive landscape analyst for early-stage startups. " +
        "Be strict: return only direct online software competitors and respond with JSON only.",
    },
    {
      role: "user",
      content: [
        `Idea: ${idea}`,
        `Industry: ${industry}`,
        `Product type: ${productType}`,
        `Target customer: ${targetCustomer}`,
        "Constraints:",
        "- Return exactly 3 direct competitors solving the same core job and product type for a similar customer.",
        "- Exclude agencies, consultants, communities, newsletters, offline programs, and generic horizontal tools.",
        "- For each competitor, provide one concise why sentence and a confidence score (0 to 1).",
        "- Output must be valid JSON only, no markdown or extra commentary.",
      ].join("\n"),
    },
  ];
}

function extractResponseText(response: OpenAIResponse): string {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const out = response?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      if (!item || typeof item !== "object" || !("content" in item)) continue;

      const content = item.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== "object" || !("text" in c)) continue;
          const text = c.text;
          if (typeof text === "string" && text.trim()) return text.trim();
        }
      }
    }
  }

  return "";
}

function logTokenDebugBeforeRequest(params: {
  phase: "primary" | "validation";
  messages: PromptMessage[];
  ragChunks?: string[];
  usingWebSearch: boolean;
}) {
  if (!SHOULD_LOG_TOKEN_DEBUG) return;

  const serializedMessages = JSON.stringify(params.messages);
  const perMessageChars = params.messages.map((message, index) => ({
    index,
    role: message.role,
    chars: message.content.length,
  }));
  const ragChunks = params.ragChunks ?? [];

  console.log("[findCompetitorsViaWeb] OpenAI payload debug:", {
    phase: params.phase,
    usingWebSearch: params.usingWebSearch,
    serializedChars: serializedMessages.length,
    messageCount: params.messages.length,
    perMessageChars,
    ragChunkCount: ragChunks.length,
    ragChunkChars: ragChunks.map((chunk) => chunk.length),
  });
}

function logTokenDebugAfterResponse(params: {
  phase: "primary" | "validation";
  response: OpenAIResponse;
  startedAt: number;
  usingWebSearch: boolean;
}) {
  if (!SHOULD_LOG_TOKEN_DEBUG) return;

  const usage = params.response?.usage;
  const reasoningTokens = usage?.output_tokens_details?.reasoning_tokens ?? null;

  console.log("[findCompetitorsViaWeb] OpenAI usage debug:", {
    phase: params.phase,
    usingWebSearch: params.usingWebSearch,
    latencyMs: Date.now() - params.startedAt,
    input_tokens: usage?.input_tokens ?? null,
    output_tokens: usage?.output_tokens ?? null,
    reasoning_tokens: reasoningTokens,
    total_tokens: usage?.total_tokens ?? null,
  });
}

function parseRawCompetitors(response: OpenAIResponse): RawCompetitor[] {
  const text = extractResponseText(response);
  if (!text) {
    throw new Error("Competitor response was empty");
  }

  const parsed = JSON.parse(text) as { competitors?: RawCompetitor[] };
  if (!Array.isArray(parsed.competitors)) {
    throw new Error("Competitor response missing competitors array");
  }
  return parsed.competitors;
}

function shouldRunValidationPass(rawCompetitors: RawCompetitor[]): boolean {
  if (rawCompetitors.length !== COMPETITOR_COUNT) return true;
  return rawCompetitors.some(
    (competitor) => clampConfidence(competitor.confidence) < VALIDATION_CONFIDENCE_THRESHOLD
  );
}

function normalizeCompetitor(competitor: RawCompetitor): Competitor {
  const why = firstSentence(competitor.why);
  return {
    name: normalizeLine(competitor.name, "Unknown competitor"),
    url: normalizeUrl(competitor.url),
    why_competitor: why,
    evidence: why,
    why,
    confidence: clampConfidence(competitor.confidence),
  };
}

async function runCompetitorRequest(params: {
  phase: "primary" | "validation";
  messages: PromptMessage[];
  usingWebSearch: boolean;
}) {
  logTokenDebugBeforeRequest({
    phase: params.phase,
    messages: params.messages,
    ragChunks: [],
    usingWebSearch: params.usingWebSearch,
  });

  const startedAt = Date.now();
  const response = await client.responses.create({
    model: PRIMARY_MODEL,
    input: params.messages,
    ...(params.usingWebSearch ? { tools: [{ type: "web_search" as const }] } : {}),
    reasoning: { effort: "minimal" },
    max_output_tokens: 320,
    text: {
      format: {
        type: "json_schema",
        name: "competitor_research",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["competitors"],
          properties: {
            competitors: {
              type: "array",
              minItems: COMPETITOR_COUNT,
              maxItems: COMPETITOR_COUNT,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "url", "why", "confidence"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 120 },
                  url: { type: "string", minLength: 1, maxLength: 200 },
                  why: { type: "string", minLength: 1, maxLength: MAX_WHY_CHARS },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                },
              },
            },
          },
        },
      },
    },
  });

  logTokenDebugAfterResponse({
    phase: params.phase,
    response,
    startedAt,
    usingWebSearch: params.usingWebSearch,
  });

  return response;
}

export async function findCompetitorsViaWeb(params: {
  idea: string;
  industry: string;
  productType?: string | null;
  targetCustomer?: string | null;
}) {
  const baseMessages = buildMinimalCompetitorMessages(params);

  const primaryResponse = await runCompetitorRequest({
    phase: "primary",
    messages: baseMessages,
    usingWebSearch: false,
  });

  let rawCompetitors = parseRawCompetitors(primaryResponse);

  if (shouldRunValidationPass(rawCompetitors)) {
    const validationMessages: PromptMessage[] = [
      ...baseMessages,
      {
        role: "user",
        content: [
          "Low-confidence output detected. Validate and replace weak entries with stronger direct competitors.",
          "Return the same strict JSON schema with exactly 3 competitors.",
        ].join("\n"),
      },
    ];

    const validationResponse = await runCompetitorRequest({
      phase: "validation",
      messages: validationMessages,
      usingWebSearch: true,
    });

    rawCompetitors = parseRawCompetitors(validationResponse);
  }

  const competitors = rawCompetitors
    .slice(0, COMPETITOR_COUNT)
    .map(normalizeCompetitor);

  if (competitors.length !== COMPETITOR_COUNT) {
    throw new Error(`Expected ${COMPETITOR_COUNT} competitors, got ${competitors.length}`);
  }

  return {
    competitors,
    // Optional field kept for compatibility with existing return shape.
    sources: null,
  };
}

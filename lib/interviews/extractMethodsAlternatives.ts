import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "../report/marketSizeUtils";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export type MethodsAlternativesExtraction = {
  competitors_used: string[];
  alternatives_used: string[];
};

function dedupeAndCap(values: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= max) break;
  }
  return out;
}

export async function extractMethodsAlternatives(
  rawText: string,
  context?: { idea?: string; problem?: string }
): Promise<MethodsAlternativesExtraction> {
  const contextPrefix =
    context?.idea || context?.problem
      ? [
          context.idea ? `The founder is building: ${context.idea}.` : "",
          context.problem ? `They are solving: ${context.problem}.` : "",
          "Use this to distinguish competitors (tools that do the same job as the founder's idea) from manual workarounds (spreadsheets, notes, DMs, etc.).",
        ]
          .filter(Boolean)
          .join(" ") + " "
      : "";

  const systemPrompt =
    contextPrefix +
    [
      "Extract methods and alternatives explicitly mentioned in this interview transcript.",
      "competitors_used: Other online tools/products they currently use or have used as substitutes.",
      "alternatives_used: Manual or non-automated workflows they use as workarounds (spreadsheets, notes, DMs, etc.).",
      "Return short normalized phrases only (2-8 words each).",
      "Do not infer. If not explicitly stated, return an empty array.",
    ].join(" ");

  const empty: MethodsAlternativesExtraction = { competitors_used: [], alternatives_used: [] };
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await client.responses.create({
        model: "gpt-5.4-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawText },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "methods_and_alternatives",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                competitors_used: {
                  type: "array",
                  items: { type: "string" },
                },
                alternatives_used: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["competitors_used", "alternatives_used"],
            },
          },
        },
      });

      const raw = extractResponseText(resp);
      if (!raw) throw new Error("extractMethodsAlternatives: empty model output");
      const parsed = JSON.parse(raw) as MethodsAlternativesExtraction;
      return {
        competitors_used: dedupeAndCap(parsed.competitors_used ?? []),
        alternatives_used: dedupeAndCap(parsed.alternatives_used ?? []),
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const isRetriable =
        lastError.message.includes("empty model output") ||
        lastError.message.includes("JSON");
      if (isRetriable && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      break;
    }
  }

  console.error("[extractMethodsAlternatives] failed, returning empty arrays:", lastError);
  return empty;
}

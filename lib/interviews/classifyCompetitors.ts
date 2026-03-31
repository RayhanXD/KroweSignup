import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "../report/marketSizeUtils";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export type CompetitorClassification = {
  directCompetitors: string[];
  onlineWorkarounds: string[];
};

export async function classifyCompetitors(
  tools: string[],
  idea: string,
  problem: string
): Promise<CompetitorClassification> {
  if (!tools.length || !idea || !problem) {
    return { directCompetitors: tools, onlineWorkarounds: [] };
  }

  const systemPrompt = [
    "You are a product strategy analyst. Given a founder's idea and problem, classify each tool as either:",
    "(a) direct_competitors — tools that do the same core job as the founder's idea (same product category, same user need)",
    "(b) online_workarounds — tools users cobble together as substitutes because no ideal solution exists, but outside the founder's product category",
    "Every input tool must appear in exactly one bucket. Return only the tool names as provided.",
  ].join(" ");

  const userPrompt = [
    `Founder's idea: ${idea}`,
    `Problem being solved: ${problem}`,
    "",
    "Tools to classify:",
    tools.map((t) => `- ${t}`).join("\n"),
  ].join("\n");

  const fallback: CompetitorClassification = { directCompetitors: tools, onlineWorkarounds: [] };
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
            name: "competitor_classification",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                direct_competitors: {
                  type: "array",
                  items: { type: "string" },
                },
                online_workarounds: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["direct_competitors", "online_workarounds"],
            },
          },
        },
      });

      const raw = extractResponseText(resp);
      if (!raw) throw new Error("classifyCompetitors: empty model output");
      const parsed = JSON.parse(raw) as { direct_competitors: string[]; online_workarounds: string[] };
      return {
        directCompetitors: parsed.direct_competitors ?? [],
        onlineWorkarounds: parsed.online_workarounds ?? [],
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

  console.error("[classifyCompetitors] failed, returning fallback:", lastError);
  return fallback;
}

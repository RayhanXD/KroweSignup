import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "@/lib/openai/extractResponseText";
import type { StructuredInterview } from "./types";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export async function structureInterview(rawText: string): Promise<StructuredInterview> {
  const systemPrompt =
    "Structure this user interview into typed segments. For each segment, write a concise summary in 'text' and copy a short verbatim quote from the interview transcript into 'quote' (exact words the person said, 10–80 chars). " +
    "Types: pain (a friction or problem), context (their situation), emotion (how they feel), intensity (how severe). " +
    "intensity_score 1–5: 1=mild, 3=significant, 5=daily blocker.";

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
            name: "structured_interview",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      type: { type: "string", enum: ["pain", "context", "emotion", "intensity"] },
                      text: { type: "string" },
                      quote: { type: "string" },
                      intensity: { type: "number" },
                    },
                    required: ["type", "text", "quote", "intensity"],
                  },
                },
                summary: { type: "string" },
              },
              required: ["segments", "summary"],
            },
          },
        },
      });

      const raw = extractResponseText(resp);
      if (!raw) {
        lastError = new Error("structureInterview: empty model output");
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw lastError;
      }

      const parsed = JSON.parse(raw) as StructuredInterview;
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

  throw lastError ?? new Error("structureInterview: failed after retries");
}

import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "@/lib/openai/extractResponseText";
import type { StructuredInterview } from "./types";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 32);
}

export async function generateInterviewTags(
  structured: StructuredInterview,
  businessProfileContext?: string
): Promise<string[]> {
  const segmentSample = structured.segments
    .slice(0, 12)
    .map((s) => s.text)
    .join("\n");

  const contextBlock = businessProfileContext
    ? `\nPROJECT CONTEXT:\n${businessProfileContext}`
    : "";

  const prompt = `You are tagging a customer discovery interview with short category labels.

INTERVIEW SUMMARY:
${structured.summary}

TRANSCRIPT EXCERPT:
${segmentSample}${contextBlock}

Choose 2–5 short, reusable category tags that describe this interview. Tags should be useful for grouping multiple interviews by theme — things like audience type, business stage, vertical, or a recurring pattern.

Rules:
- Lowercase, hyphenated (e.g. early-stage, solo-founder, b2b, pricing-pain)
- No # prefix, no spaces
- Prefer tags that would likely appear across multiple interviews, not one-off specifics
- Maximum 5 tags

Return JSON: { "tags": string[] }`.trim();

  try {
    const resp = await client.responses.create({
      model: "gpt-5.4-mini",
      input: [{ role: "user", content: prompt }],
      text: {
        format: {
          type: "json_schema",
          name: "interview_tags",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              tags: { type: "array", items: { type: "string" } },
            },
            required: ["tags"],
          },
        },
      },
    });

    const raw = extractResponseText(resp);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { tags: string[] };
    const normalized = Array.from(
      new Set(parsed.tags.map(normalizeTag).filter(Boolean))
    ).slice(0, 5);

    return normalized;
  } catch (e) {
    console.error("[generateInterviewTags] failed:", e);
    return [];
  }
}

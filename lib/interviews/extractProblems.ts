import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "../report/marketSizeUtils";
import type { InterviewSegment, ExtractedProblem } from "./types";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export async function extractProblems(
  segments: InterviewSegment[],
  rawText: string
): Promise<ExtractedProblem[]> {
  const systemPrompt =
    "Extract normalized problems from these interview segments. Each must be a specific friction point " +
    "(not a feature request, not vague). Merge duplicates. " +
    "Each result must include BOTH: " +
    "1) supporting_quote: a concise normalized summary/paraphrase of the pain point, and " +
    "2) verbatim_quote: an exact short quote copied from the interview text that best supports the pain point. " +
    "If an exact quote is unavailable, set verbatim_quote to an empty string. " +
    "For root_cause: identify the underlying reason this problem exists — must be broader than problem_text, explain WHY it occurs, not just that it occurs. " +
    "E.g., if the problem is 'users can't find their saved items', root_cause might be 'no persistent state management between sessions'. root_cause must not repeat problem_text wording.";

  const userContent = JSON.stringify({ segments, rawText });

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await client.responses.create({
        model: "gpt-5.4-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "extracted_problems",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                problems: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      problem_text: { type: "string" },
                      customer_type: { type: "string" },
                      context: { type: "string" },
                      root_cause: { type: "string" },
                      intensity_score: { type: "number" },
                      confidence: { type: "number" },
                      supporting_quote: { type: "string" },
                      verbatim_quote: { type: "string" },
                    },
                    required: [
                      "problem_text",
                      "customer_type",
                      "context",
                      "root_cause",
                      "intensity_score",
                      "confidence",
                      "supporting_quote",
                      "verbatim_quote",
                    ],
                  },
                },
              },
              required: ["problems"],
            },
          },
        },
      });

      const raw = extractResponseText(resp);
      if (!raw) {
        lastError = new Error("extractProblems: empty model output");
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw lastError;
      }

      const parsed = JSON.parse(raw) as { problems: ExtractedProblem[] };
      return parsed.problems;
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

  throw lastError ?? new Error("extractProblems: failed after retries");
}

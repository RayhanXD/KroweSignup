import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "@/lib/openai/extractResponseText";
import type { ExtractedProblemWithEmbedding } from "./types";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export async function mergeCluster(
  problems: ExtractedProblemWithEmbedding[]
): Promise<string> {
  if (problems.length === 1) {
    return problems[0].problem_text;
  }

  const problemList = problems
    .map((p, i) => `${i + 1}. "${p.problem_text}"`)
    .join("\n");

  const systemPrompt =
    "You synthesize multiple similar user problems into one canonical problem statement. " +
    "The statement must be user-centric, specific, and actionable. " +
    "Reference actual user behavior or context. " +
    "Avoid generic labels like 'time management' or 'lack of direction'. " +
    "Return only the problem statement — no explanation, no preamble.";

  const userPrompt = `These problems were clustered as semantically similar. Write a single canonical problem statement that captures the shared core:\n\n${problemList}`;

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
      });

      const raw = extractResponseText(resp);
      if (!raw) {
        lastError = new Error("mergeCluster: empty model output");
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw lastError;
      }

      return raw.trim();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      throw lastError;
    }
  }

  // Fallback: use highest-confidence member text
  const best = problems.reduce((a, b) => (b.confidence > a.confidence ? b : a));
  return best.problem_text;
}

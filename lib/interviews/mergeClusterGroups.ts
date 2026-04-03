import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "../report/marketSizeUtils";
import type { ExtractedProblemWithEmbedding, ProblemCluster, SupportingQuote } from "./types";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

type ClusterWithMembers = ProblemCluster & { _members: ExtractedProblemWithEmbedding[] };

export async function mergeClusterGroups(
  clusters: ClusterWithMembers[],
  totalInterviews: number,
  totalProblems: number,
  maxClusters = 6
): Promise<ProblemCluster[]> {
  if (clusters.length <= maxClusters) {
    // No merge needed — strip _members before returning
    return clusters.map(({ _members, ...rest }) => {
      void _members;
      return rest;
    });
  }

  const clusterList = clusters
    .map((c, i) => `${i}: ${c.canonical_problem}`)
    .join("\n");

  const systemPrompt =
    `You are reducing many similar problem clusters to ${maxClusters} decisive root problems. ` +
    "Merge overlapping clusters aggressively. Each output cluster must represent ONE distinct root workflow failure. " +
    "Be ruthless — combine anything related to the same underlying cause. " +
    "Every input cluster index must appear in exactly one output group.";

  const userPrompt =
    `Merge these ${clusters.length} clusters into at most ${maxClusters} groups. ` +
    "Return JSON with a 'groups' array where each group has 'indices' (array of input cluster indices to merge) " +
    "and 'canonical_problem' (the single best problem statement for the merged group).\n\n" +
    clusterList;

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
            name: "cluster_merge",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                groups: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      indices: { type: "array", items: { type: "number" } },
                      canonical_problem: { type: "string" },
                    },
                    required: ["indices", "canonical_problem"],
                  },
                },
              },
              required: ["groups"],
            },
          },
        },
      });

      const raw = extractResponseText(resp);
      if (!raw) {
        lastError = new Error("mergeClusterGroups: empty model output");
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw lastError;
      }

      const parsed = JSON.parse(raw) as { groups: Array<{ indices: number[]; canonical_problem: string }> };

      // Rebuild clusters from merged groups
      const result: ProblemCluster[] = parsed.groups.map((group) => {
        const mergedMembers = group.indices.flatMap((i) => clusters[i]?._members ?? []);
        const frequency = new Set(mergedMembers.map((m) => m.interview_id)).size;
        const avg_intensity =
          mergedMembers.reduce((s, m) => s + m.intensity_score, 0) / (mergedMembers.length || 1);
        const consistency_score = totalInterviews > 0 ? frequency / totalInterviews : 0;
        const normalized_freq = totalProblems > 0 ? mergedMembers.length / totalProblems : 0;
        const score =
          normalized_freq * 0.4 + consistency_score * 0.4 + (avg_intensity / 5) * 0.2;

        const supporting_quotes: SupportingQuote[] = mergedMembers
          .map((m) => ({
            text: m.verbatim_quote || m.supporting_quote,
            normalized_text: m.supporting_quote,
            verbatim_text: m.verbatim_quote || undefined,
            interview_id: m.interview_id,
            problem_id: m.id,
          }))
          .filter((q) => q.text);

        // Preserve category from the highest-scoring source cluster in the group
        const bestSource = group.indices
          .map((i) => clusters[i])
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)[0];

        return {
          canonical_problem: group.canonical_problem,
          frequency,
          avg_intensity,
          consistency_score,
          score,
          supporting_quotes,
          member_problem_ids: mergedMembers.map((m) => m.id),
          category: bestSource?.category ?? "General Problems",
        };
      });

      return result;
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

  // Fallback: top maxClusters by score, no merge
  console.warn("[mergeClusterGroups] LLM failed — falling back to top N by score");
  return clusters
    .sort((a, b) => b.score - a.score)
    .slice(0, maxClusters)
    .map(({ _members, ...rest }) => {
      void _members;
      return rest;
    });
}

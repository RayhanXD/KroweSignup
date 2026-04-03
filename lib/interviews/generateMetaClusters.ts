import OpenAI from "openai";
import { ENV } from "../env";
import { extractResponseText } from "../report/marketSizeUtils";
import type { ProblemCluster, MetaCluster } from "./types";
import { selectTopQuotes } from "./scoreProblems";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export async function generateMetaClusters(clusters: ProblemCluster[]): Promise<MetaCluster[]> {
  if (clusters.length === 0) return [];

  const clusterInput = clusters.map((c, i) => ({
    id: `cluster_${i}`,
    canonical_problem: c.canonical_problem,
    frequency: c.frequency,
    avg_intensity: c.avg_intensity,
    score: c.score,
  }));

  const systemPrompt =
    "You are a senior product strategist synthesizing customer research. Group related problem clusters into 3–5 high-level meta-themes that represent actionable product opportunities. Each meta-theme should be a decision-ready problem statement — specific, actionable, and grounded in the data.";

  const userPrompt = [
    "Here are the problem clusters identified from customer interviews:",
    "",
    JSON.stringify(clusterInput, null, 2),
    "",
    "Group these into 3–5 meta-clusters. Each meta-cluster should:",
    "- Have a title that is a complete, specific problem statement (not a generic label like 'Technical Issues')",
    "- Describe the underlying user need in 1–2 sentences",
    "- Reference the cluster IDs that belong to this meta-cluster",
    "",
    "Return JSON with an array of meta-clusters.",
  ].join("\n");

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
            name: "meta_clusters_output",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                meta_clusters: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      cluster_ids: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "description", "cluster_ids"],
                  },
                },
              },
              required: ["meta_clusters"],
            },
          },
        },
      });

      const raw = extractResponseText(resp);
      if (!raw) {
        lastError = new Error("generateMetaClusters: empty model output");
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw lastError;
      }

      const parsed = JSON.parse(raw) as {
        meta_clusters: Array<{ title: string; description: string; cluster_ids: string[] }>;
      };

      // Rebuild data from matched source clusters
      const result: MetaCluster[] = parsed.meta_clusters
        .map((mc, i) => {
          const matchedClusters = mc.cluster_ids
            .map((cid) => {
              const idx = parseInt(cid.replace("cluster_", ""), 10);
              return isNaN(idx) ? null : clusters[idx] ?? null;
            })
            .filter((c): c is ProblemCluster => c !== null);

          if (matchedClusters.length === 0) return null;

          const quotesWithIntensity = matchedClusters.flatMap((c) =>
            c.supporting_quotes.map((q) => ({
              ...q,
              intensity: c.avg_intensity,
            }))
          );
          const supportingQuotes = selectTopQuotes(quotesWithIntensity);
          const frequency = matchedClusters.reduce((sum, c) => sum + c.frequency, 0);
          const score =
            matchedClusters.reduce((sum, c) => sum + c.score, 0) / matchedClusters.length;

          return {
            id: `meta_${i}`,
            title: mc.title,
            description: mc.description,
            cluster_ids: mc.cluster_ids,
            supporting_quotes: supportingQuotes,
            frequency,
            score,
          } satisfies MetaCluster;
        })
        .filter((mc): mc is MetaCluster => mc !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

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

  throw lastError ?? new Error("generateMetaClusters: failed after retries");
}

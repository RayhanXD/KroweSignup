import OpenAI from "openai";
import { ENV } from "../env";
import type { ProblemCluster } from "./types";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

const FALLBACK_CATEGORY = "General Problems";

type CategoryAssignment = {
  name: string;
  cluster_indices: number[];
};

type CategoriesResponse = {
  categories: CategoryAssignment[];
};

export async function categorizeClusterGroups(
  clusters: ProblemCluster[]
): Promise<ProblemCluster[]> {
  if (clusters.length === 0) return clusters;

  const clusterList = clusters
    .map((c, i) => `${i}. ${c.canonical_problem}`)
    .join("\n");

  const systemPrompt =
    "You are a product research analyst. Group problem clusters into 2–5 named categories. " +
    "Each category name should be a short, descriptive label (e.g. 'Workflow & Process Issues', 'Communication Gaps'). " +
    "Every cluster index must appear in exactly one category. " +
    "Return valid JSON only — no explanation.";

  const userPrompt =
    `Group these problem clusters into 2–5 named categories:\n\n${clusterList}\n\n` +
    `Return JSON in this exact format:\n` +
    `{"categories": [{"name": "Category Name", "cluster_indices": [0, 2]}, ...]}`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as CategoriesResponse;

    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      throw new Error("Invalid response structure");
    }

    // Build index→category map
    const categoryMap = new Map<number, string>();
    for (const cat of parsed.categories) {
      if (!cat.name || !Array.isArray(cat.cluster_indices)) continue;
      for (const idx of cat.cluster_indices) {
        if (typeof idx === "number" && idx >= 0 && idx < clusters.length) {
          categoryMap.set(idx, cat.name);
        }
      }
    }

    return clusters.map((c, i) => ({
      ...c,
      category: categoryMap.get(i) ?? FALLBACK_CATEGORY,
    }));
  } catch (e) {
    console.error("[categorizeClusterGroups] LLM categorization failed, using fallback:", e);
    return clusters.map((c) => ({ ...c, category: FALLBACK_CATEGORY }));
  }
}

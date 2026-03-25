import OpenAI from "openai";
import { ENV } from "../env";
import type { ExtractedProblemWithEmbedding } from "./types";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export async function embedProblems(
  problems: { id: string; text: string }[]
): Promise<{ id: string; embedding: number[] }[]> {
  const results: { id: string; embedding: number[] }[] = [];
  const batchSize = 20;

  for (let i = 0; i < problems.length; i += batchSize) {
    const batch = problems.slice(i, i + batchSize);
    const resp = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map((p) => p.text),
    });

    for (let j = 0; j < batch.length; j++) {
      results.push({ id: batch[j].id, embedding: resp.data[j].embedding });
    }
  }

  return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function computeCentroid(embeddings: number[][]): number[] {
  const dim = embeddings[0].length;
  const centroid = new Array<number>(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length;
  }
  return centroid;
}

export function clusterByCosineSimilarity(
  problems: ExtractedProblemWithEmbedding[],
  threshold = 0.82
): ExtractedProblemWithEmbedding[][] {
  const clusters: ExtractedProblemWithEmbedding[][] = [];
  const centroids: number[][] = [];

  for (const problem of problems) {
    let bestIdx = -1;
    let bestSim = -1;

    for (let i = 0; i < centroids.length; i++) {
      const sim = cosineSimilarity(problem.embedding, centroids[i]);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestSim >= threshold) {
      clusters[bestIdx].push(problem);
      centroids[bestIdx] = computeCentroid(clusters[bestIdx].map((p) => p.embedding));
    } else {
      clusters.push([problem]);
      centroids.push([...problem.embedding]);
    }
  }

  return clusters;
}

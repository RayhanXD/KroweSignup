import type { ExtractedProblemWithEmbedding } from "./types";

export function scoreCluster(
  cluster: ExtractedProblemWithEmbedding[],
  totalInterviews: number,
  totalProblems: number
): {
  frequency: number;
  avg_intensity: number;
  consistency_score: number;
  score: number;
} {
  const frequency = cluster.length;
  const avg_intensity =
    cluster.reduce((sum, p) => sum + p.intensity_score, 0) / frequency;

  const uniqueInterviews = new Set(cluster.map((p) => p.interview_id));
  const consistency_score =
    totalInterviews > 0 ? uniqueInterviews.size / totalInterviews : 0;

  const normalized_freq = totalProblems > 0 ? frequency / totalProblems : 0;
  const normalized_intensity = avg_intensity / 5;
  const score =
    normalized_freq * 0.4 +
    consistency_score * 0.4 +
    normalized_intensity * 0.2;

  return { frequency, avg_intensity, consistency_score, score };
}

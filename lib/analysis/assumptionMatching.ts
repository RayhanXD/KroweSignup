import { embedProblems, cosineSimilarity } from "../interviews/clusterProblems";
import type { ProblemCluster } from "../interviews/types";

export type OnboardingData = {
  idea?: string | null;
  problem?: string | null;
  target_customer?: string | null;
  industry?: string | null;
  features?: string | null;
  competitors?: string | null;
  alternatives?: string | null;
  pricing_model?: string | null;
  startup_stage?: string | null;
};

export type AssumptionAnalysis = {
  assumptionText: string;
  alignment: "validated" | "weak_signal" | "not_supported";
  topMatches: Array<{
    clusterIndex: number;
    summary: string;
    similarity: number;
    quotes: string[];
  }>;
  bestSimilarity: number;
};

export type AssumptionVsEvidenceReport = {
  problem: AssumptionAnalysis;
  targetCustomer: AssumptionAnalysis;
  features: AssumptionAnalysis[];
  competitors?: AssumptionAnalysis[];
  alternatives?: AssumptionAnalysis[];
};

type ClusterWithEmbedding = {
  cluster: ProblemCluster;
  index: number;
  embedding: number[];
};

function parseFeatureTexts(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === "string" && s.trim().length > 0);
    }
  } catch {
    // not valid JSON
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? [trimmed] : [];
}

function classifyAlignment(
  score: number,
  frequency: number
): "validated" | "weak_signal" | "not_supported" {
  if (score < 0.4) return "not_supported";
  if (score >= 0.75 && frequency >= 2) return "validated";
  return "weak_signal";
}

function getTopMatches(
  queryEmbedding: number[],
  clustersWithEmbeddings: ClusterWithEmbedding[],
  topK: number
): Array<{ cluster: ProblemCluster; index: number; similarity: number }> {
  return clustersWithEmbeddings
    .map((c) => ({
      cluster: c.cluster,
      index: c.index,
      similarity: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

function buildAssumptionAnalysis(
  text: string,
  queryEmbedding: number[],
  clustersWithEmbeddings: ClusterWithEmbedding[],
  topK = 3
): AssumptionAnalysis {
  const matches = getTopMatches(queryEmbedding, clustersWithEmbeddings, topK);
  const bestSimilarity = matches.length > 0 ? matches[0].similarity : 0;
  const topFrequency = matches.length > 0 ? matches[0].cluster.frequency : 0;

  return {
    assumptionText: text,
    alignment: classifyAlignment(bestSimilarity, topFrequency),
    topMatches: matches.map((m) => ({
      clusterIndex: m.index,
      summary: m.cluster.canonical_problem,
      similarity: m.similarity,
      quotes: m.cluster.supporting_quotes.map((q) => q.text),
    })),
    bestSimilarity,
  };
}

function notSupportedSentinel(text: string): AssumptionAnalysis {
  return {
    assumptionText: text,
    alignment: "not_supported",
    topMatches: [],
    bestSimilarity: 0,
  };
}

export async function runAssumptionMatching(
  onboarding: OnboardingData,
  clusters: ProblemCluster[]
): Promise<AssumptionVsEvidenceReport> {
  const problemText = onboarding.problem?.trim() || "";
  const tcText = onboarding.target_customer?.trim() || "";
  const featureTexts = parseFeatureTexts(onboarding.features);
  const competitorText = onboarding.competitors?.trim() || "";
  const alternativeText = onboarding.alternatives?.trim() || "";

  // Early return if no clusters — no API call needed
  if (clusters.length === 0) {
    return {
      problem: notSupportedSentinel(problemText),
      targetCustomer: notSupportedSentinel(tcText),
      features: featureTexts.map(notSupportedSentinel),
      competitors: competitorText ? [notSupportedSentinel(competitorText)] : undefined,
      alternatives: alternativeText ? [notSupportedSentinel(alternativeText)] : undefined,
    };
  }

  // Build unified batch with namespaced IDs
  const batchItems: { id: string; text: string }[] = [];

  if (problemText) batchItems.push({ id: "a::problem", text: problemText });
  if (tcText) batchItems.push({ id: "a::tc", text: tcText });
  featureTexts.forEach((f, i) => batchItems.push({ id: `a::feat::${i}`, text: f }));
  if (competitorText) batchItems.push({ id: "a::comp", text: competitorText });
  if (alternativeText) batchItems.push({ id: "a::alt", text: alternativeText });

  // Add clusters
  clusters.forEach((c, i) =>
    batchItems.push({ id: `c::${i}`, text: c.canonical_problem })
  );

  let embeddingMap: Map<string, number[]>;
  try {
    const results = await embedProblems(batchItems);
    embeddingMap = new Map(results.map((r) => [r.id, r.embedding]));
  } catch (err) {
    console.error("[assumptionMatching] embedProblems failed:", err);
    return {
      problem: notSupportedSentinel(problemText),
      targetCustomer: notSupportedSentinel(tcText),
      features: featureTexts.map(notSupportedSentinel),
      competitors: competitorText ? [notSupportedSentinel(competitorText)] : undefined,
      alternatives: alternativeText ? [notSupportedSentinel(alternativeText)] : undefined,
    };
  }

  // Reconstruct cluster embeddings
  const clustersWithEmbeddings: ClusterWithEmbedding[] = clusters
    .map((c, i) => ({
      cluster: c,
      index: i,
      embedding: embeddingMap.get(`c::${i}`) ?? [],
    }))
    .filter((c) => c.embedding.length > 0);

  // Build each AssumptionAnalysis
  const problemEmb = embeddingMap.get("a::problem");
  const problemAnalysis = problemText && problemEmb
    ? buildAssumptionAnalysis(problemText, problemEmb, clustersWithEmbeddings)
    : notSupportedSentinel(problemText);

  const tcEmb = embeddingMap.get("a::tc");
  const targetCustomerAnalysis = tcText && tcEmb
    ? buildAssumptionAnalysis(tcText, tcEmb, clustersWithEmbeddings)
    : notSupportedSentinel(tcText);

  const featuresAnalysis: AssumptionAnalysis[] = featureTexts.map((f, i) => {
    const emb = embeddingMap.get(`a::feat::${i}`);
    return emb
      ? buildAssumptionAnalysis(f, emb, clustersWithEmbeddings)
      : notSupportedSentinel(f);
  });

  const compEmb = embeddingMap.get("a::comp");
  const competitorsAnalysis = competitorText && compEmb
    ? [buildAssumptionAnalysis(competitorText, compEmb, clustersWithEmbeddings)]
    : competitorText
    ? [notSupportedSentinel(competitorText)]
    : undefined;

  const altEmb = embeddingMap.get("a::alt");
  const alternativesAnalysis = alternativeText && altEmb
    ? [buildAssumptionAnalysis(alternativeText, altEmb, clustersWithEmbeddings)]
    : alternativeText
    ? [notSupportedSentinel(alternativeText)]
    : undefined;

  return {
    problem: problemAnalysis,
    targetCustomer: targetCustomerAnalysis,
    features: featuresAnalysis,
    competitors: competitorsAnalysis,
    alternatives: alternativesAnalysis,
  };
}

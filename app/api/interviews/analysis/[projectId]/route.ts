import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { analyzeHypothesisVsReality } from "@/lib/analysis/hypothesisVsReality";
import type { AnalysisInput, AnalysisResult, AnalysisContext, QuoteSlim, SignalStrengthMetrics } from "@/lib/analysis/hypothesisVsReality";
import type { FeatureSpec } from "@/lib/interviews/types";
import { classifyCompetitors } from "@/lib/interviews/classifyCompetitors";
import {
  buildAnalysisAnswerHelpers,
  fetchSignupAnswersForSession,
  STEP_KEYS_SCRIPT,
} from "@/lib/interviews/founderContextFromSignup";

function isMissingAnalysisColumnsError(message: string): boolean {
  return (
    message.includes("analysis_basis_updated_at") ||
    message.includes("analysis_generated_at") ||
    message.includes("analysis_result")
  );
}

function isMissingMethodsColumnsError(message: string): boolean {
  return message.includes("competitors_used") || message.includes("current_methods");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Fetch project to get session_id
  const projectRes = await supabase
    .from("interview_projects")
    .select("id, session_id, user_id")
    .eq("id", projectId)
    .single();

  if (projectRes.error || !projectRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let sessionId = projectRes.data.session_id as string | null;

  if (!sessionId) {
    const { data: fallbackSession } = await supabase
      .from("signup_sessions")
      .select("id")
      .eq("user_id", projectRes.data.user_id)
      .maybeSingle();
    sessionId = fallbackSession?.id ?? null;
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "No onboarding data linked" },
      { status: 422 }
    );
  }

  // 2. Fetch all needed data in parallel
  const [signupRows, decisionResWithAnalysisCols, clustersRes, interviewCountRes, interviewMethodsResRaw] = await Promise.all([
    fetchSignupAnswersForSession(supabase, sessionId, STEP_KEYS_SCRIPT),
    supabase
      .from("decision_outputs")
      .select(
        "reasoning, feature_specs, confidence_score, updated_at, analysis_result, analysis_basis_updated_at, analysis_generated_at"
      )
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("problem_clusters")
      .select("canonical_problem, supporting_quotes, score, frequency, avg_intensity, consistency_score")
      .eq("project_id", projectId)
      .order("score", { ascending: false })
      .limit(10),
    supabase
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("interviews")
      .select("competitors_used, alternatives_used")
      .eq("project_id", projectId),
  ]);

  let decisionRes = decisionResWithAnalysisCols;
  if (
    decisionResWithAnalysisCols.error &&
    isMissingAnalysisColumnsError(decisionResWithAnalysisCols.error.message)
  ) {
    // Backward-compatible fallback for environments where migration 010 is not applied yet.
    decisionRes = (await supabase
      .from("decision_outputs")
      .select("reasoning, feature_specs, confidence_score, updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1)) as unknown as typeof decisionResWithAnalysisCols;
  }

  let interviewMethodsRes = interviewMethodsResRaw;
  if (interviewMethodsResRaw.error && isMissingMethodsColumnsError(interviewMethodsResRaw.error.message)) {
    interviewMethodsRes = (await supabase
      .from("interviews")
      .select("current_methods, alternatives_used")
      .eq("project_id", projectId)) as unknown as typeof interviewMethodsResRaw;
  }

  const { getAnswer, featuresArray } = buildAnalysisAnswerHelpers(signupRows);
  const decisionRows = decisionRes.data ?? [];
  const decision = decisionRows[0] ?? null;
  const clusters = clustersRes.data ?? [];
  const interviewMethodsRows = interviewMethodsRes.data ?? [];
  const decisionUpdatedAt = decision?.updated_at ? new Date(decision.updated_at).toISOString() : null;

  const methodsCounts = new Map<string, number>();
  const alternativesCounts = new Map<string, number>();
  for (const row of interviewMethodsRows as Array<Record<string, unknown>>) {
    const methods = Array.isArray(row.competitors_used)
      ? row.competitors_used
      : Array.isArray(row.current_methods)
        ? row.current_methods
        : [];
    const alternatives = Array.isArray(row.alternatives_used) ? row.alternatives_used : [];
    for (const m of methods) {
      if (typeof m !== "string" || !m.trim()) continue;
      const key = m.trim();
      methodsCounts.set(key, (methodsCounts.get(key) ?? 0) + 1);
    }
    for (const a of alternatives) {
      if (typeof a !== "string" || !a.trim()) continue;
      const key = a.trim();
      alternativesCounts.set(key, (alternativesCounts.get(key) ?? 0) + 1);
    }
  }
  const currentMethods = [...methodsCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([text]) => text);
  const alternativesUsed = [...alternativesCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([text]) => text);

  // Classify competitors vs online workarounds
  let directCompetitors = currentMethods;
  let onlineWorkarounds: string[] = [];
  const idea = getAnswer("idea");
  const problem = getAnswer("problem");
  if (currentMethods.length > 0 && idea && problem) {
    try {
      const cls = await classifyCompetitors(currentMethods, String(idea), String(problem));
      directCompetitors = cls.directCompetitors;
      onlineWorkarounds = cls.onlineWorkarounds;
    } catch { /* fallback stays */ }
  }

  // Compute signal metrics from top cluster (always live, not cached)
  const topClusterForMetrics = clusters[0];
  const allQuotes: Array<{ interview_id?: string }> = topClusterForMetrics?.supporting_quotes ?? [];
  const uniqueIntervieweeSet = new Set(allQuotes.map((q) => q.interview_id).filter(Boolean));
  const signalMetrics: SignalStrengthMetrics | null = topClusterForMetrics
    ? {
        interviewCount: interviewCountRes.count ?? 0,
        uniqueInterviewees: uniqueIntervieweeSet.size,
        consistencyScore: topClusterForMetrics.consistency_score ?? 0,
        avgIntensity: topClusterForMetrics.avg_intensity ?? 0,
        frequency: topClusterForMetrics.frequency ?? 0,
        clusterScore: topClusterForMetrics.score ?? 0,
      }
    : null;

  // Return persisted snapshot when it matches the current decision version.
  const analysisResult =
    decision && "analysis_result" in decision ? (decision.analysis_result as AnalysisResult | null) : null;
  const analysisBasisUpdatedAt =
    decision && "analysis_basis_updated_at" in decision
      ? (decision.analysis_basis_updated_at as string | null)
      : null;

  // 3. Build AnalysisInput (hoisted so it's available for cache hits too)
  const topCluster = clusters[0];
  const topProblem = topCluster?.canonical_problem ?? "";

  const supportingQuotes = (topCluster?.supporting_quotes ?? [])
    .slice(0, 5)
    .map((q: { text: string }) => q.text);

  const problemClusters = clusters.map((c) => c.canonical_problem);

  const featureSpecs = decision?.feature_specs
    ? (decision.feature_specs as FeatureSpec[]).map((f) => f.name)
    : [];

  const reasoning = decision?.reasoning
    ? Array.isArray(decision.reasoning)
      ? decision.reasoning
      : []
    : [];

  const topQuotesSlim: QuoteSlim[] = (topCluster?.supporting_quotes ?? [])
    .slice(0, 2)
    .map((q: { text: string; interview_id: string }) => ({ text: q.text, interview_id: q.interview_id }));

  const featureSpecsSlim = decision?.feature_specs
    ? (decision.feature_specs as FeatureSpec[]).map((f) => ({ name: f.name, description: f.description, priority: f.priority }))
    : [];

  function buildContext(customerInsight: string): AnalysisContext {
    return {
      founderProblem: getAnswer("problem"),
      founderCustomer: getAnswer("target_customer"),
      founderFeatures: featuresArray,
      topProblem,
      topQuotes: topQuotesSlim,
      customerInsight,
      featureSpecs: featureSpecsSlim,
    };
  }

  if (
    decision &&
    decisionUpdatedAt &&
    analysisResult &&
    analysisBasisUpdatedAt &&
    new Date(analysisBasisUpdatedAt).toISOString() === decisionUpdatedAt
  ) {
    console.info(`[analysis] cache hit for project ${projectId}`);
    const context = buildContext(analysisResult.breakdown.customerAlignment.reasoning);
    return NextResponse.json({ ...analysisResult, context, signalMetrics });
  }

  const analysisInput: AnalysisInput = {
    onboarding: {
      idea: getAnswer("idea"),
      problem: getAnswer("problem"),
      target_customer: getAnswer("target_customer"),
      features: featuresArray,
    },
    interviewData: {
      topProblem,
      problemClusters,
      supportingQuotes,
      featureSpecs,
      reasoning,
      directCompetitors,
      onlineWorkarounds,
      alternativesUsed,
    },
  };

  // 4. Run LLM analysis
  try {
    const result = await analyzeHypothesisVsReality(analysisInput);

    if (decisionUpdatedAt) {
      const nowIso = new Date().toISOString();
      const { data: persisted, error: persistErr } = await supabase
        .from("decision_outputs")
        .update({
          analysis_result: result,
          analysis_basis_updated_at: decisionUpdatedAt,
          analysis_generated_at: nowIso,
        })
        .eq("project_id", projectId)
        .eq("updated_at", decisionUpdatedAt)
        .select("analysis_result, analysis_basis_updated_at")
        .single();

      if (persistErr) {
        console.warn(`[analysis] failed to persist for project ${projectId}: ${persistErr.message}`);
      } else if (
        persisted?.analysis_result &&
        persisted.analysis_basis_updated_at &&
        new Date(persisted.analysis_basis_updated_at).toISOString() === decisionUpdatedAt
      ) {
        console.info(`[analysis] generated and persisted for project ${projectId}`);
        const persistedResult = persisted.analysis_result as AnalysisResult;
        return NextResponse.json({ ...persistedResult, context: buildContext(persistedResult.breakdown.customerAlignment.reasoning), signalMetrics });
      } else {
        console.info(`[analysis] basis mismatch while persisting for project ${projectId}`);
      }
    }

    return NextResponse.json({ ...result, context: buildContext(result.breakdown.customerAlignment.reasoning), signalMetrics });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { analyzeHypothesisVsReality } from "@/lib/analysis/hypothesisVsReality";
import type { AnalysisInput, AnalysisResult, AnalysisContext, QuoteSlim } from "@/lib/analysis/hypothesisVsReality";
import type { FeatureSpec } from "@/lib/interviews/types";

function isMissingAnalysisColumnsError(message: string): boolean {
  return (
    message.includes("analysis_basis_updated_at") ||
    message.includes("analysis_generated_at") ||
    message.includes("analysis_result")
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = createServerSupabaseClient();

  // 1. Fetch project to get session_id
  const projectRes = await supabase
    .from("interview_projects")
    .select("id, session_id")
    .eq("id", projectId)
    .single();

  if (projectRes.error || !projectRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sessionId = projectRes.data.session_id;
  if (!sessionId) {
    return NextResponse.json(
      { error: "No onboarding data linked" },
      { status: 422 }
    );
  }

  // 2. Fetch all needed data in parallel
  const [answersRes, decisionResWithAnalysisCols, clustersRes] = await Promise.all([
    supabase
      .from("signup_answers")
      .select("step_key, final_answer")
      .eq("session_id", sessionId)
      .in("step_key", ["idea", "problem", "target_customer", "features"]),
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
      .select("canonical_problem, supporting_quotes, score")
      .eq("project_id", projectId)
      .order("score", { ascending: false })
      .limit(10),
  ]);

  let decisionRes = decisionResWithAnalysisCols;
  if (
    decisionResWithAnalysisCols.error &&
    isMissingAnalysisColumnsError(decisionResWithAnalysisCols.error.message)
  ) {
    // Backward-compatible fallback for environments where migration 010 is not applied yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decisionRes = (await supabase
      .from("decision_outputs")
      .select("reasoning, feature_specs, confidence_score, updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1)) as any;
  }

  const answers = answersRes.data ?? [];
  const decisionRows = decisionRes.data ?? [];
  const decision = decisionRows[0] ?? null;
  const clusters = clustersRes.data ?? [];
  const decisionUpdatedAt = decision?.updated_at ? new Date(decision.updated_at).toISOString() : null;

  // Return persisted snapshot when it matches the current decision version.
  const analysisResult =
    decision && "analysis_result" in decision ? (decision.analysis_result as AnalysisResult | null) : null;
  const analysisBasisUpdatedAt =
    decision && "analysis_basis_updated_at" in decision
      ? (decision.analysis_basis_updated_at as string | null)
      : null;

  // 3. Build AnalysisInput (hoisted so it's available for cache hits too)
  const getAnswer = (key: string) =>
    answers.find((a) => a.step_key === key)?.final_answer ?? "";

  const featuresRaw = getAnswer("features");
  let featuresArray: string[] = [];
  if (featuresRaw) {
    try {
      const parsed = JSON.parse(featuresRaw);
      featuresArray = Array.isArray(parsed) ? parsed.map(String) : [featuresRaw];
    } catch {
      featuresArray = [featuresRaw];
    }
  }

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
    return NextResponse.json({ ...analysisResult, context });
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
        return NextResponse.json({ ...persistedResult, context: buildContext(persistedResult.breakdown.customerAlignment.reasoning) });
      } else {
        console.info(`[analysis] basis mismatch while persisting for project ${projectId}`);
      }
    }

    return NextResponse.json({ ...result, context: buildContext(result.breakdown.customerAlignment.reasoning) });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

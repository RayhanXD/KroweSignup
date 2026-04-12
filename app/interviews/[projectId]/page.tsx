import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { notFound } from "next/navigation";
import { ProjectPageClient } from "./ProjectPageClient";
import type { ProblemCluster, DecisionOutput, FeatureSpec } from "@/lib/interviews/types";
import type { AnalysisResponse } from "@/lib/analysis/hypothesisVsReality";
import {
  computeInterviewSignal,
  deriveInterviewSignalLabel,
  type InterviewSignalLabel,
  type InterviewSignalMetrics,
} from "@/lib/interviews/interviewSignal";

export const dynamic = "force-dynamic";

type Interview = {
  id: string;
  status: "pending" | "structured" | "failed";
  created_at: string;
  interviewee_name: string | null;
  interviewee_context: string | null;
  high_signal: boolean;
  signal_label: InterviewSignalLabel;
  signal_metrics: InterviewSignalMetrics;
};

type Project = {
  id: string;
  name: string;
  status: "collecting" | "processing" | "ready" | "failed";
  interview_count: number;
  created_at: string;
  updated_at: string;
  session_id: string | null;
};

type ClusterWithId = ProblemCluster & { id: string };
type DecisionWithId = Omit<DecisionOutput, "project_id"> & { id: string; updated_at: string };
type AnalysisDecision = AnalysisResponse["decision"];

function isMissingAnalysisResultColumnError(message: string): boolean {
  return message.includes("analysis_result");
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();

  const [projectRes, interviewsRes, decisionResWithAnalysis, clustersRes] = await Promise.all([
    supabase
      .from("interview_projects")
      .select("id, name, status, interview_count, created_at, updated_at, session_id")
      .eq("id", projectId)
      .single(),
    supabase
      .from("interviews")
      .select("id, status, created_at, interviewee_name, interviewee_context")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("decision_outputs")
      .select(
        "id, selected_cluster_id, reasoning, feature_specs, user_flows, edge_cases, success_metrics, confidence_score, meta_clusters, status, updated_at, created_at, analysis_result"
      )
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("problem_clusters")
      .select(
        "id, canonical_problem, frequency, avg_intensity, consistency_score, score, supporting_quotes, member_problem_ids, category"
      )
      .eq("project_id", projectId)
      .order("score", { ascending: false }),
  ]);

  if (projectRes.error || !projectRes.data) {
    notFound();
  }

  let decisionRes = decisionResWithAnalysis;
  if (
    decisionResWithAnalysis.error &&
    isMissingAnalysisResultColumnError(decisionResWithAnalysis.error.message)
  ) {
    decisionRes = (await supabase
      .from("decision_outputs")
      .select(
        "id, selected_cluster_id, reasoning, feature_specs, user_flows, edge_cases, success_metrics, confidence_score, meta_clusters, status, updated_at, created_at"
      )
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1)) as unknown as typeof decisionResWithAnalysis;
  }

  const project = projectRes.data as Project;
  const interviewsRaw = (interviewsRes.data ?? []) as Array<Omit<Interview, "high_signal" | "signal_label" | "signal_metrics">>;
  const interviewIds = interviewsRaw.map((i) => i.id);
  const extractedProblemsRes = interviewIds.length
    ? await supabase
        .from("extracted_problems")
        .select("interview_id, intensity_score, confidence")
        .in("interview_id", interviewIds)
    : { data: [] };
  const extractedProblems = (extractedProblemsRes.data ?? []) as Array<{
    interview_id: string;
    intensity_score: number | null;
    confidence: number | null;
  }>;
  const problemsByInterviewId = new Map<string, Array<{ intensity_score: number | null; confidence: number | null }>>();
  for (const row of extractedProblems) {
    const existing = problemsByInterviewId.get(row.interview_id) ?? [];
    existing.push({
      intensity_score: row.intensity_score,
      confidence: row.confidence,
    });
    problemsByInterviewId.set(row.interview_id, existing);
  }
  const interviews = interviewsRaw.map((interview) => {
    const problems = problemsByInterviewId.get(interview.id) ?? [];
    const signal = computeInterviewSignal(problems);
    return {
      ...interview,
      high_signal: signal.high_signal,
      signal_label: deriveInterviewSignalLabel(interview.status, signal),
      signal_metrics: signal.metrics,
    };
  });
  const decisionRows = (decisionRes.data ?? []) as Array<
    DecisionWithId & { analysis_result?: AnalysisResponse | null }
  >;
  const latestDecision: DecisionWithId | null = decisionRows[0] ?? null;
  const latestDecisionVerdict: AnalysisDecision | null = decisionRows[0]?.analysis_result?.decision ?? null;
  const allClusters = (clustersRes.data ?? []) as ClusterWithId[];
  const topCluster = latestDecision?.selected_cluster_id
    ? allClusters.find((c) => c.id === latestDecision.selected_cluster_id) ?? allClusters[0] ?? null
    : allClusters[0] ?? null;
  const sortedFeatures = [...(((latestDecision?.feature_specs as FeatureSpec[] | null) ?? []) as FeatureSpec[])];

  return (
    <ProjectPageClient
      project={project}
      interviews={interviews}
      projectId={projectId}
      latestDecision={latestDecision}
      topCluster={topCluster}
      allClusters={allClusters}
      decisionFeatures={sortedFeatures}
      latestDecisionVerdict={latestDecisionVerdict}
    />
  );
}

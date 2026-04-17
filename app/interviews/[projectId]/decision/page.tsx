import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionPageClient } from "./DecisionPageClient";
import type {
  ProblemCluster,
  FeatureSpec,
  UserFlow,
  EdgeCase,
  SuccessMetric,
  DecisionOutput,
  MetaCluster,
} from "@/lib/interviews/types";
import type { AnalysisResponse, AnalysisResult } from "@/lib/analysis/hypothesisVsReality";

export const dynamic = "force-dynamic";

type ClusterWithId = ProblemCluster & { id: string };
type DecisionWithId = Omit<DecisionOutput, "project_id"> & { id: string; updated_at: string };

function isMissingAnalysisResultColumnError(message: string): boolean {
  return message.includes("analysis_result");
}

const priorityOrder: Record<FeatureSpec["priority"], number> = {
  "must-have": 0,
  "should-have": 1,
  "nice-to-have": 2,
};

export default async function DecisionPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();

  const [projectRes, decisionResWithAnalysis, clustersRes, interviewsRes] = await Promise.all([
    supabase
      .from("interview_projects")
      .select("id, name")
      .eq("id", projectId)
      .single(),
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
    supabase
      .from("interviews")
      .select("id, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  if (projectRes.error || !projectRes.data) notFound();

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

  const project = projectRes.data;
  const decisionRows = (decisionRes.data ?? []) as Array<
    DecisionWithId & { analysis_result?: AnalysisResult | null }
  >;
  const decision: DecisionWithId | null = decisionRows[0] ?? null;
  const persistedAnalysis: AnalysisResult | null = decisionRows[0]?.analysis_result ?? null;
  const allClusters = (clustersRes.data ?? []) as ClusterWithId[];
  const interviews = (interviewsRes.data ?? []) as Array<{ id: string; created_at: string }>;
  const interviewsSortedIds = interviews.map((i) => i.id);

  const topCluster = decision?.selected_cluster_id
    ? allClusters.find((c) => c.id === decision.selected_cluster_id) ?? null
    : allClusters[0] ?? null;

  if (!decision || decision.status !== "ready") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <Link href={`/interviews/${projectId}`} className="text-sm text-muted-foreground hover:underline">
            ← Back to project
          </Link>
          <div className="mt-8 text-center py-16">
            <p className="text-lg font-medium mb-2">
              {decision?.status === "insufficient_data"
                ? "Insufficient data"
                : decision?.status === "processing"
                ? "Analysis in progress..."
                : "No decision yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {decision?.status === "insufficient_data"
                ? "Add more interviews with higher signal to generate a decision."
                : "Run analysis from the project page to generate a decision."}
            </p>
            {(decision?.status === "insufficient_data" || !decision) && (
              <Link
                href={`/interviews/${projectId}`}
                className="inline-flex px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
              >
                ← Back to project to rerun
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const metaClusters = (decision.meta_clusters as MetaCluster[] | null) ?? [];
  const featureSpecs = (decision.feature_specs as FeatureSpec[] | null) ?? [];
  const userFlows = (decision.user_flows as UserFlow[] | null) ?? [];
  const edgeCases = (decision.edge_cases as EdgeCase[] | null) ?? [];
  const successMetrics = (decision.success_metrics as SuccessMetric[] | null) ?? [];

  const sortedFeatures = [...featureSpecs].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
  const confidencePct = Math.round((decision.confidence_score ?? 0) * 100);

  return (
    <DecisionPageClient
      projectId={projectId}
      project={project}
      decision={decision}
      topCluster={topCluster}
      allClusters={allClusters}
      metaClusters={metaClusters}
      userFlows={userFlows}
      edgeCases={edgeCases}
      successMetrics={successMetrics}
      sortedFeatures={sortedFeatures}
      confidencePct={confidencePct}
      interviewsSortedIds={interviewsSortedIds}
      persistedAnalysis={persistedAnalysis}
    />
  );
}

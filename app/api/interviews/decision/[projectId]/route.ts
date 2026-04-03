import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [decisionRes, clustersRes] = await Promise.all([
    supabase
      .from("decision_outputs")
      .select(
        "id, selected_cluster_id, reasoning, feature_specs, user_flows, edge_cases, success_metrics, confidence_score, status, created_at"
      )
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("problem_clusters")
      .select(
        "id, canonical_problem, frequency, avg_intensity, consistency_score, score, supporting_quotes, member_problem_ids"
      )
      .eq("project_id", projectId)
      .order("score", { ascending: false }),
  ]);

  const decision = decisionRes.data;
  const allClusters = clustersRes.data ?? [];
  const topCluster = decision?.selected_cluster_id
    ? allClusters.find((c) => c.id === decision.selected_cluster_id) ?? null
    : null;

  return NextResponse.json({ decision, topCluster, allClusters });
}

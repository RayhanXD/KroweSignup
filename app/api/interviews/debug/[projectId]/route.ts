import { NextRequest, NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { summarizeInterviewScriptForDebug } from "@/lib/interviews/scriptCache";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projectRes, decisionRes, interviewsRes] = await Promise.all([
    supabase
      .from("interview_projects")
      .select("id, status, interview_count, updated_at, interview_script")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("decision_outputs")
      .select("id, status, updated_at, confidence_score")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("interviews")
      .select("id, status")
      .eq("project_id", projectId),
  ]);

  const interviews = interviewsRes.data ?? [];
  const interviewIds = interviews.map((i: { id: string }) => i.id);

  const [problemsRes, clustersRes] = await Promise.all([
    interviewIds.length > 0
      ? supabase
          .from("extracted_problems")
          .select("id, embedding, supporting_quote")
          .in("interview_id", interviewIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("problem_clusters")
      .select("id, score, frequency")
      .eq("project_id", projectId),
  ]);

  const problems = problemsRes.data ?? [];
  const clusters = clustersRes.data ?? [];

  const interviewStatusCounts = interviews.reduce(
    (acc: Record<string, number>, i: { status: string }) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return NextResponse.json({
    project: projectRes.data,
    script: summarizeInterviewScriptForDebug(projectRes.data?.interview_script),
    decision: decisionRes.data,
    interviews: {
      total: interviews.length,
      by_status: interviewStatusCounts,
    },
    problems: {
      total: problems.length,
      with_embedding: problems.filter((p: { embedding: unknown }) => p.embedding).length,
      with_supporting_quote: problems.filter((p: { supporting_quote: unknown }) => p.supporting_quote).length,
    },
    clusters: {
      total: clusters.length,
      top_score: clusters.length > 0 ? Math.max(...clusters.map((c: { score: number }) => c.score)) : null,
    },
  });
}

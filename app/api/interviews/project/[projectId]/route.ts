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

  const [projectRes, interviewsRes, clustersRes] = await Promise.all([
    supabase
      .from("interview_projects")
      .select("id, name, status, interview_count, created_at, updated_at, session_id")
      .eq("id", projectId)
      .single(),
    supabase
      .from("interviews")
      .select("id, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("problem_clusters")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
  ]);

  if (projectRes.error) {
    return NextResponse.json({ error: projectRes.error.message }, { status: 404 });
  }

  return NextResponse.json({
    project: projectRes.data,
    interviews: interviewsRes.data ?? [],
    clusterCount: clustersRes.count ?? 0,
  });
}

import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, string | null> = {};
  if ("interviewer_name" in body) updates.interviewer_name = (body.interviewer_name ?? "").trim() || null;
  if ("interviewer_context" in body) updates.interviewer_context = (body.interviewer_context ?? "").trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Clear cached script so it regenerates with new interviewer info
  updates.interview_script = null;

  const { error } = await supabase
    .from("interview_projects")
    .update(updates)
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

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
      .select("id, name, status, interview_count, created_at, updated_at, session_id, interviewer_name, interviewer_context")
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

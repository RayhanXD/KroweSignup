import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

type UsageRange = "24h" | "7d" | "30d";

function parseRange(raw: string | null): UsageRange {
  if (raw === "7d" || raw === "30d") return raw;
  return "24h";
}

function rangeToSince(range: UsageRange): string {
  const now = Date.now();
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

export async function GET(req: Request) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = parseRange(searchParams.get("range"));
  const since = rangeToSince(range);

  const [
    projectsRes,
    projectsCreatedRes,
    interviewsCreatedRes,
    decisionReadyRes,
    logsRes,
  ] = await Promise.all([
    supabase
      .from("interview_projects")
      .select("id, status, interview_count")
      .eq("user_id", user.id)
      .is("archived_at", null),
    supabase
      .from("interview_projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("archived_at", null)
      .gte("created_at", since),
    supabase
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .in(
        "project_id",
        (
          await supabase
            .from("interview_projects")
            .select("id")
            .eq("user_id", user.id)
            .is("archived_at", null)
        ).data?.map((p) => p.id) ?? [],
      ),
    supabase
      .from("decision_outputs")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready")
      .gte("updated_at", since)
      .in(
        "project_id",
        (
          await supabase
            .from("interview_projects")
            .select("id")
            .eq("user_id", user.id)
            .is("archived_at", null)
        ).data?.map((p) => p.id) ?? [],
      ),
    supabase
      .from("dashboard_activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since),
  ]);

  if (projectsRes.error) {
    return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
  }

  const projects = projectsRes.data ?? [];
  const activeProjects = projects.filter(
    (p) => p.status === "collecting" || p.status === "processing",
  ).length;
  const totalInterviews = projects.reduce((sum, p) => sum + (p.interview_count ?? 0), 0);

  return NextResponse.json({
    range,
    since,
    metrics: {
      totalProjects: projects.length,
      activeProjects,
      totalInterviews,
      projectsCreatedInRange: projectsCreatedRes.count ?? 0,
      interviewsCreatedInRange: interviewsCreatedRes.count ?? 0,
      decisionsReadyInRange: decisionReadyRes.count ?? 0,
      activityEventsInRange: logsRes.count ?? 0,
    },
  });
}

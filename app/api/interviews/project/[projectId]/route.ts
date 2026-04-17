import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { createClient } from "@supabase/supabase-js";
import {
  didInterviewerFieldsChange,
  normalizeOptionalText,
} from "@/lib/interviews/scriptCache";
import { deriveOnboardingCompletion } from "@/lib/interviews/businessProfile";
import { trackDashboardActivity } from "@/lib/interviews/dashboardActivity";

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
  let clearsScriptCache = false;

  const hasName = "name" in body;
  const hasStatus = "status" in body;
  const hasInterviewerName = "interviewer_name" in body;
  const hasInterviewerContext = "interviewer_context" in body;

  if (hasName) {
    const nextName = String(body.name ?? "").trim();
    if (!nextName) {
      return NextResponse.json({ error: "Project name cannot be empty" }, { status: 400 });
    }
    updates.name = nextName;
  }
  if (hasStatus) {
    const allowed = new Set(["collecting", "processing", "ready", "failed"]);
    const status = String(body.status ?? "");
    if (!allowed.has(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    updates.status = status;
  }
  if (hasInterviewerName) {
    updates.interviewer_name = normalizeOptionalText(body.interviewer_name);
  }
  if (hasInterviewerContext) {
    updates.interviewer_context = normalizeOptionalText(body.interviewer_context);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const currentRes = await supabase
    .from("interview_projects")
    .select("id, name, status, interviewer_name, interviewer_context")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .single();

  if (currentRes.error || !currentRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const nextName = hasInterviewerName
    ? updates.interviewer_name
    : currentRes.data.interviewer_name;
  const nextContext = hasInterviewerContext
    ? updates.interviewer_context
    : currentRes.data.interviewer_context;

  const changed = didInterviewerFieldsChange({
    currentName: currentRes.data.interviewer_name,
    currentContext: currentRes.data.interviewer_context,
    nextName,
    nextContext,
  });

  if (!changed && !hasName && !hasStatus) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  if (changed) {
    // Clear cached script only when interviewer context actually changes.
    updates.interview_script = null;
    clearsScriptCache = true;
  }

  const { data: updatedProject, error } = await supabase
    .from("interview_projects")
    .update(updates)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select("id, name, status, interview_count, created_at, updated_at, session_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await trackDashboardActivity(supabase, {
    userId: user.id,
    action: "project_updated",
    entityType: "project",
    entityId: projectId,
    projectId,
    metadata: {
      changed_fields: Object.keys(updates),
      script_cache_cleared: clearsScriptCache,
      previous_name: currentRes.data.name,
      previous_status: currentRes.data.status,
      next_name: updatedProject.name,
      next_status: updatedProject.status,
    },
  });

  return NextResponse.json({ ok: true, project: updatedProject });
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
      .select("id, name, status, interview_count, created_at, updated_at, session_id, interviewer_name, interviewer_context, onboarding_mode, onboarding_completed_at")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .is("archived_at", null)
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

  const project = projectRes.data;
  let onboardingMode = project.onboarding_mode as "manual" | "webscraper" | null;
  let onboardingCompletedAt = project.onboarding_completed_at as string | null;

  if (!onboardingCompletedAt) {
    const onboarding = await deriveOnboardingCompletion(supabase, project.session_id);
    if (onboarding.completed) {
      onboardingMode = onboarding.onboardingMode;
      onboardingCompletedAt = new Date().toISOString();
      await supabase
        .from("interview_projects")
        .update({
          onboarding_mode: onboardingMode,
          onboarding_completed_at: onboardingCompletedAt,
          updated_at: onboardingCompletedAt,
        })
        .eq("id", projectId)
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({
    project: {
      ...project,
      onboarding_mode: onboardingMode,
      onboarding_completed_at: onboardingCompletedAt,
    },
    interviews: interviewsRes.data ?? [],
    clusterCount: clustersRes.count ?? 0,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "true";

  if (permanent) {
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: deleted, error } = await adminClient
      .from("interview_projects")
      .delete()
      .eq("id", projectId)
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!deleted) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    return NextResponse.json({ ok: true });
  }

  const nowIso = new Date().toISOString();
  const { data: archived, error } = await supabase
    .from("interview_projects")
    .update({ archived_at: nowIso, updated_at: nowIso })
    .eq("id", projectId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id, name")
    .single();

  if (error || !archived) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await trackDashboardActivity(supabase, {
    userId: user.id,
    action: "project_archived",
    entityType: "project",
    entityId: projectId,
    projectId,
    metadata: { name: archived.name },
  });

  return NextResponse.json({ ok: true });
}

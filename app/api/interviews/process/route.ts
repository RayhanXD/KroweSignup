import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { runDecisionPipeline } from "@/lib/interviews/pipeline";

export const maxDuration = 300;

const PROCESSING_STALE_MS = 10 * 60 * 1000;

function isStaleProcessing(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true;
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > PROCESSING_STALE_MS;
}

export async function POST(req: Request) {
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const projectId = (body.projectId ?? "").trim();
  const force = body.force === true;

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const { data: project, error: projErr } = await supabase
    .from("interview_projects")
    .select("id, status, interview_count, updated_at, session_id, onboarding_mode, onboarding_completed_at")
    .eq("id", projectId)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.interview_count < 3) {
    return NextResponse.json(
      { error: "At least 3 interviews are required before running analysis" },
      { status: 422 }
    );
  }

  if (
    !force &&
    project.status === "processing" &&
    !isStaleProcessing(project.updated_at)
  ) {
    return NextResponse.json({ ok: true, status: "processing" });
  }

  const { error: updateErr } = await supabase
    .from("interview_projects")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  waitUntil(
    runDecisionPipeline(projectId, force).catch((e) => {
      console.error(`[process] Pipeline error for project ${projectId}:`, e);
    })
  );

  return NextResponse.json({ ok: true, status: "processing" });
}

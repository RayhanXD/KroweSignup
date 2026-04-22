import { NextResponse, after } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { runLivePreview } from "@/lib/interviews/livePreview";

export const maxDuration = 10;

export async function POST(req: Request) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const projectId = (body.projectId ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  // Verify the user owns this project
  const { data: proj } = await supabase
    .from("interview_projects")
    .select("id")
    .eq("id", projectId)
    .single();
  if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  after(() => {
    runLivePreview(projectId).catch((e) =>
      console.error("[preview] failed", projectId, e)
    );
  });

  return NextResponse.json({ ok: true, status: "preview_started" });
}

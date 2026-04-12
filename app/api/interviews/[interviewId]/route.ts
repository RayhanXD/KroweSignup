import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  const { interviewId } = await params;
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Handle interviewee metadata update (independent of transcript update)
  if ("intervieweeName" in body || "intervieweeContext" in body) {
    const metaUpdate: Record<string, string | null> = {};
    if ("intervieweeName" in body) metaUpdate.interviewee_name = body.intervieweeName ?? null;
    if ("intervieweeContext" in body) metaUpdate.interviewee_context = body.intervieweeContext ?? null;

    const { error: metaErr } = await supabase
      .from("interviews")
      .update(metaUpdate)
      .eq("id", interviewId);

    if (metaErr) {
      return NextResponse.json({ error: metaErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const rawText = (body.rawText ?? "").trim();

  if (rawText.length < 100) {
    return NextResponse.json(
      { error: "Interview text must be at least 100 characters" },
      { status: 400 }
    );
  }

  const { error: deleteErr } = await supabase
    .from("extracted_problems")
    .delete()
    .eq("interview_id", interviewId);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from("interviews")
    .update({ raw_text: rawText, status: "pending", structured_segments: null })
    .eq("id", interviewId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  const { interviewId } = await params;
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: interview, error: interviewErr } = await supabase
    .from("interviews")
    .select("id, project_id")
    .eq("id", interviewId)
    .single();

  if (interviewErr || !interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const projectId = interview.project_id as string;

  const { error: problemsDeleteErr } = await supabase
    .from("extracted_problems")
    .delete()
    .eq("interview_id", interviewId);

  if (problemsDeleteErr) {
    return NextResponse.json({ error: problemsDeleteErr.message }, { status: 500 });
  }

  const { error: deleteInterviewErr } = await supabase
    .from("interviews")
    .delete()
    .eq("id", interviewId);

  if (deleteInterviewErr) {
    return NextResponse.json({ error: deleteInterviewErr.message }, { status: 500 });
  }

  const { count: remainingCount, error: remainingCountErr } = await supabase
    .from("interviews")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (remainingCountErr) {
    return NextResponse.json({ error: remainingCountErr.message }, { status: 500 });
  }

  const { error: updateProjectErr } = await supabase
    .from("interview_projects")
    .update({ interview_count: remainingCount ?? 0 })
    .eq("id", projectId);

  if (updateProjectErr) {
    return NextResponse.json({ error: updateProjectErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

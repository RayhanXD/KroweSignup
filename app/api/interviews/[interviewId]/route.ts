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

import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export async function POST(req: Request) {
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const projectId = (body.projectId ?? "").trim();
  const rawText = (body.rawText ?? "").trim();

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }
  if (rawText.length < 100) {
    return NextResponse.json(
      { error: "Interview text must be at least 100 characters" },
      { status: 400 }
    );
  }

  const { data: interview, error: insertErr } = await supabase
    .from("interviews")
    .insert({ project_id: projectId, raw_text: rawText })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const { data: proj } = await supabase
    .from("interview_projects")
    .select("interview_count")
    .eq("id", projectId)
    .single();

  if (proj) {
    await supabase
      .from("interview_projects")
      .update({
        interview_count: (proj.interview_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
  }

  return NextResponse.json({ interviewId: interview.id });
}

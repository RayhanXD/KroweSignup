import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

export async function GET(req: Request) {
  if (!FEATURE_FLAGS.granolaImports) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
  }

  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assignmentStatus = searchParams.get("status") ?? "unassigned";

  const { data, error } = await supabase
    .from("granola_inbox_items")
    .select(
      "id, external_note_id, title, transcript_preview, summary_text, summary_markdown, owner_name, owner_email, granola_created_at, granola_updated_at, attendees, normalized_text, assignment_status, assigned_project_id, assigned_interview_id, assigned_at, created_at"
    )
    .eq("user_id", user.id)
    .eq("assignment_status", assignmentStatus)
    .order("granola_updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: projects, error: projectErr } = await supabase
    .from("interview_projects")
    .select("id, name, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (projectErr) return NextResponse.json({ error: projectErr.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], projects: projects ?? [] });
}

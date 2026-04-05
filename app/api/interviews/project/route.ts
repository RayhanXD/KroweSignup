import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export async function POST(req: Request) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Missing project name" }, { status: 400 });
  }

  // Only accept sessionId from admin; auto-lookup for regular users
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  let sessionId: string | null = isAdmin ? ((body.sessionId ?? "").trim() || null) : null;

  if (!isAdmin) {
    const { data: session } = await supabase
      .from("signup_sessions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    sessionId = session?.id ?? null;
  }

  // Prevent duplicate project per user
  const { data: existing } = await supabase
    .from("interview_projects")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: "You already have a project" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("interview_projects")
    .insert({ name, session_id: sessionId, user_id: user.id })
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projectId: data.id, status: data.status });
}

export async function GET(req: Request) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  let query = supabase
    .from("interview_projects")
    .select("id, name, status, interview_count, created_at, updated_at, session_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data });
}

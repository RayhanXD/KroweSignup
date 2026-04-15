import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  if (!FEATURE_FLAGS.granolaImports) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
  }

  const { itemId } = await params;
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const projectId = String(body.projectId ?? "").trim();
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const { data, error } = await supabase.rpc("assign_granola_inbox_item", {
    p_item_id: itemId,
    p_project_id: projectId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, interviewId: data });
}

import { NextResponse } from "next/server";
import { getFirstStepKey, normalizeStepKey } from "@/lib/signupSteps";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export async function POST() {
  try {
    const supabase = await createInterviewAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Idempotent: return existing session if found
    const { data: existing } = await supabase
      .from("signup_sessions")
      .select("id, current_step_key, status")
      .eq("user_id", user.id)
      .maybeSingle();

    let session = existing;
    if (session) {
      const normalizedKey = normalizeStepKey(String(session.current_step_key));
      if (normalizedKey !== String(session.current_step_key)) {
        await supabase
          .from("signup_sessions")
          .update({ current_step_key: normalizedKey })
          .eq("id", session.id);
        session = { ...session, current_step_key: normalizedKey };
      }
    }

    if (!session) {
      const { data, error } = await supabase
        .from("signup_sessions")
        .insert({
          status: "in_progress",
          current_step_key: getFirstStepKey(),
          user_id: user.id,
        })
        .select("id, current_step_key, status")
        .single();
      if (error || !data) {
        return NextResponse.json(
          { error: error?.message ?? "Failed to create session" },
          { status: 500 }
        );
      }
      session = data;
    }

    // Fetch answers for resume (empty for new sessions)
    const { data: answers } = await supabase
      .from("signup_answers")
      .select("step_key, raw_answer")
      .eq("session_id", session.id);

    const answersByStepKey: Record<string, string> = {};
    for (const a of answers ?? []) {
      answersByStepKey[a.step_key] = a.raw_answer ?? "";
    }

    return NextResponse.json({
      sessionId: session.id,
      currentStepKey: normalizeStepKey(String(session.current_step_key)),
      status: session.status,
      answersByStepKey,
    });
  } catch (err) {
    console.error("Unexpected error in session/start:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

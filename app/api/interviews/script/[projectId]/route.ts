import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { generateScript } from "@/lib/interviews/generateScript";
import { shouldUseStoredInterviewScript } from "@/lib/interviews/scriptCache";
import {
  buildScriptOnboardingFromRows,
  fetchSignupAnswersForSession,
  STEP_KEYS_SCRIPT,
} from "@/lib/interviews/founderContextFromSignup";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const regenerate = searchParams.get("regenerate") === "true";

  // 1. Fetch project row
  const projectRes = await supabase
    .from("interview_projects")
    .select("id, session_id, interview_script, interviewer_name, interviewer_context")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectRes.error || !projectRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { session_id, interview_script, interviewer_name, interviewer_context } = projectRes.data as {
    session_id: string | null;
    interview_script: unknown;
    interviewer_name: string | null;
    interviewer_context: string | null;
  };

  // 2. Cache hit — return stored script (unless regeneration requested)
  if (shouldUseStoredInterviewScript(interview_script, regenerate)) {
    console.info("[script] cache hit", { projectId, userId: user.id });
    return NextResponse.json(interview_script);
  }
  console.info("[script] cache miss", { projectId, userId: user.id, regenerate });

  // 3. Fetch onboarding answers if session exists
  let onboardingData = null;
  if (session_id) {
    const rows = await fetchSignupAnswersForSession(
      supabase,
      session_id,
      STEP_KEYS_SCRIPT
    );
    onboardingData = buildScriptOnboardingFromRows(rows);
  }

  // 4. Generate script via LLM
  const interviewerInfo = (interviewer_name || interviewer_context)
    ? { name: interviewer_name, context: interviewer_context }
    : null;
  try {
    console.info("[script] generation start", { projectId, userId: user.id });
    const script = await generateScript(onboardingData, interviewerInfo);

    // 5. Persist to DB
    const persistRes = await supabase
      .from("interview_projects")
      .update({ interview_script: script })
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (persistRes.error) {
      console.error("[script] persist failed", {
        projectId,
        userId: user.id,
        error: persistRes.error.message,
      });
      return NextResponse.json(
        { error: "Script generated but failed to save. Please try again." },
        { status: 500 }
      );
    }

    console.info("[script] persist success", { projectId, userId: user.id });

    const persistedRes = await supabase
      .from("interview_projects")
      .select("interview_script")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (persistedRes.error) {
      console.error("[script] post-save read failed", {
        projectId,
        userId: user.id,
        error: persistedRes.error.message,
      });
      return NextResponse.json(script);
    }

    return NextResponse.json(persistedRes.data?.interview_script ?? script);
  } catch (err) {
    console.error("[script] generation failed:", err);
    return NextResponse.json({ error: "Script generation failed" }, { status: 500 });
  }
}

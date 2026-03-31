import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { generateScript } from "@/lib/interviews/generateScript";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = createServerSupabaseClient();

  // 1. Fetch project row
  const projectRes = await supabase
    .from("interview_projects")
    .select("id, session_id, interview_script")
    .eq("id", projectId)
    .single();

  if (projectRes.error || !projectRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { session_id, interview_script } = projectRes.data as {
    session_id: string | null;
    interview_script: unknown;
  };

  // 2. Cache hit — return stored script
  if (interview_script) {
    return NextResponse.json(interview_script);
  }

  // 3. Fetch onboarding answers if session exists
  let onboardingData = null;
  if (session_id) {
    const answersRes = await supabase
      .from("signup_answers")
      .select("step_key, final_answer")
      .eq("session_id", session_id)
      .in("step_key", ["idea", "problem", "target_customer", "features"]);

    if (answersRes.data && answersRes.data.length > 0) {
      const getAnswer = (key: string) =>
        answersRes.data.find((a) => a.step_key === key)?.final_answer ?? "";

      const featuresRaw = getAnswer("features");
      let featuresArray: string[] = [];
      if (featuresRaw) {
        try {
          const parsed = JSON.parse(featuresRaw);
          featuresArray = Array.isArray(parsed) ? parsed.map(String) : [featuresRaw];
        } catch {
          featuresArray = [featuresRaw];
        }
      }

      onboardingData = {
        idea: getAnswer("idea"),
        problem: getAnswer("problem"),
        target_customer: getAnswer("target_customer"),
        features: featuresArray,
      };
    }
  }

  // 4. Generate script via LLM
  try {
    const script = await generateScript(onboardingData);

    // 5. Persist to DB
    await supabase
      .from("interview_projects")
      .update({ interview_script: script })
      .eq("id", projectId);

    return NextResponse.json(script);
  } catch (err) {
    console.error("[script] generation failed:", err);
    return NextResponse.json({ error: "Script generation failed" }, { status: 500 });
  }
}

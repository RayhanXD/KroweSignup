import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import {
  deriveOnboardingCompletion,
  prefillBusinessProfileFromSignup,
} from "@/lib/interviews/businessProfile";
import { URL_ONBOARDING_STEP_KEYS } from "@/lib/signup/urlOnboarding";

type SignupAnswerRow = {
  step_key: string;
  final_answer: string | null;
  final_source: string | null;
  confirmed_at: string | null;
};

function parseFinalAnswer(value: string | null): unknown {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectRes = await supabase
    .from("interview_projects")
    .select("id, session_id, onboarding_mode, onboarding_completed_at")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectRes.error || !projectRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sessionId = projectRes.data.session_id as string | null;
  const sessionRes = sessionId
    ? await supabase
        .from("signup_sessions")
        .select("onboarding_source_url, onboarding_source_updated_at")
        .eq("id", sessionId)
        .maybeSingle()
    : { data: null, error: null };

  if (sessionRes.error) {
    return NextResponse.json({ error: sessionRes.error.message }, { status: 500 });
  }

  const signupRowsRes = sessionId
    ? await supabase
        .from("signup_answers")
        .select("step_key, final_answer, final_source, confirmed_at")
        .eq("session_id", sessionId)
        .in("step_key", URL_ONBOARDING_STEP_KEYS)
    : { data: [] as SignupAnswerRow[], error: null };

  if (signupRowsRes.error) {
    return NextResponse.json({ error: signupRowsRes.error.message }, { status: 500 });
  }

  const signupRows = (signupRowsRes.data ?? []) as SignupAnswerRow[];
  const profile = prefillBusinessProfileFromSignup(
    signupRows.map((row) => ({
      step_key: row.step_key,
      final_answer: row.final_answer,
    }))
  );

  let onboardingMode = projectRes.data.onboarding_mode as "manual" | "webscraper" | null;
  let onboardingCompletedAt = projectRes.data.onboarding_completed_at as string | null;

  if (!onboardingCompletedAt) {
    const onboarding = await deriveOnboardingCompletion(supabase, sessionId);
    if (onboarding.completed) {
      onboardingMode = onboarding.onboardingMode;
      onboardingCompletedAt = new Date().toISOString();
      await supabase
        .from("interview_projects")
        .update({
          onboarding_mode: onboardingMode,
          onboarding_completed_at: onboardingCompletedAt,
          updated_at: onboardingCompletedAt,
        })
        .eq("id", projectId)
        .eq("user_id", user.id);
    }
  }

  const answers = Object.fromEntries(
    signupRows.map((row) => [
      row.step_key,
      {
        value: parseFinalAnswer(row.final_answer),
        finalSource: row.final_source,
        confirmedAt: row.confirmed_at,
      },
    ])
  );

  return NextResponse.json({
    profile,
    meta: {
      source: "onboarding",
      answerCount: signupRows.length,
    },
    onboarding: {
      mode: onboardingMode,
      completedAt: onboardingCompletedAt,
      sourceUrl: sessionRes.data?.onboarding_source_url ?? null,
      sourceUpdatedAt: sessionRes.data?.onboarding_source_updated_at ?? null,
    },
    answers,
  });
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Business Profile is onboarding-backed and not editable here." },
    { status: 405 }
  );
}

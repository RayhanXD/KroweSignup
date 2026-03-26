import { NextResponse } from "next/server";
import { getNextStepKey, isValidStepKey, StepKey } from "@/lib/signupSteps";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { validateStep } from "@/lib/validators";
import { normalizeAnswer } from "@/lib/utils/strings";
import { VALIDATION_THRESHOLDS } from "@/lib/constants";
import type { SubmitAnswerRequest } from "@/lib/types/api";

type Body = {
  sessionId: string;
  stepKey: string;
  answerText: string;
  force?: boolean; // when user clicks “Continue anyway”
};

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = (await req.json()) as Body;

  const sessionId = (body.sessionId || "").trim();
  const stepKeyRaw = (body.stepKey || "").trim();
  const force = Boolean(body.force);

  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  if (!isValidStepKey(stepKeyRaw)) return NextResponse.json({ error: "Invalid stepKey" }, { status: 400 });

  const stepKey = stepKeyRaw as StepKey;

  // silent normalization (trim/spacing) :contentReference[oaicite:10]{index=10}
  const answerText = normalizeAnswer(body.answerText ?? "");

  // get existing fail_count
  const { data: existing, error: exErr } = await supabase
    .from("signup_answers")
    .select("fail_count")
    .eq("session_id", sessionId)
    .eq("step_key", stepKey)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  const prevFailCount = existing?.fail_count ?? 0;

  // validate is computed
  const validation = validateStep(stepKey, answerText);

  const nextFailCount =
    validation.status === "needs_fix" ? prevFailCount + 1 : 0;

  const canContinueWithWarning = validation.status === "needs_fix" && nextFailCount >= VALIDATION_THRESHOLDS.FAIL_COUNT_BEFORE_WARNING; 
  // meaning: they already failed once (fail #1), now on fail #2+ we let them continue :contentReference[oaicite:11]{index=11}

  // upsert answer + validation fields
  const { error: upErr } = await supabase
    .from("signup_answers")
    .upsert(
      {
        session_id: sessionId,
        step_key: stepKey,
        raw_answer: answerText,
        validation_status: validation.status,
        validation_issues: validation.issues,
        fail_count: nextFailCount,
      },
      { onConflict: "session_id,step_key" }
    );

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // decide whether to advance
  const shouldAdvance =
    validation.status === "ok" ||
    (validation.status === "needs_fix" && force && canContinueWithWarning);

  const nextStepKey = shouldAdvance ? getNextStepKey(stepKey) : null;

  if (shouldAdvance && nextStepKey) {
    const { error: sessErr } = await supabase
      .from("signup_sessions")
      .update({ current_step_key: nextStepKey })
      .eq("id", sessionId);

    if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });
  }

  return NextResponse.json({
    validationStatus: validation.status,
    issues: validation.issues,
    failCount: nextFailCount,
    canContinueWithWarning,
    nextStepKey,
  });
}

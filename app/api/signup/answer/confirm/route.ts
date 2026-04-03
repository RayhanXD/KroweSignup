import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getNextStepKeyForContext, isValidStepKey, StepKey } from "@/lib/signupSteps";
import type { ConfirmAnswerRequest } from "@/lib/types/api";

type Body = ConfirmAnswerRequest;

export async function POST(req: Request) {
    const supabase = createServerSupabaseClient();
    const body = (await req.json()) as Body;

    const sessionId = (body.sessionId || "").trim();
    const stepKeyRaw = (body.stepKey || "").trim();

    if (!sessionId) return NextResponse.json({error: "Missing SessionId"}, {status: 400});
    if (!isValidStepKey(stepKeyRaw)) return NextResponse.json({error: "Invalid stepKey"}, {status: 400})

    const stepKey = stepKeyRaw as StepKey;
    const finalAnswer = (body.finalAnswer ?? "").toString().trim();
    if (!finalAnswer) return NextResponse.json({error: "finalAnswer Requried"}, {status: 400})

    // 1) write final fields
    const {error: upErr} = await supabase
        .from("signup_answers")
        .upsert(
            {
                session_id: sessionId,
                step_key: stepKey,
                final_answer: finalAnswer,
                final_source: body.finalSource,
                confirmed_at: new Date().toISOString(),
            },
            { onConflict: "session_id,step_key"}
        );

    if (upErr) return NextResponse.json({error: upErr.message}, {status: 500});

    // 2) advance session (skip interview upload when interview_count is 0)
    const interviewCount = stepKey === "interview_count" ? Number(finalAnswer) : undefined;
    const next = getNextStepKeyForContext(stepKey, { interviewCount });
    if (next) {
        const {error: sessErr} = await supabase
        .from("signup_sessions")
        .update({current_step_key: next})
        .eq("id", sessionId);

        if (sessErr) return NextResponse.json({error: sessErr.message}, {status: 500});
    }

    return NextResponse.json({ok: true, nextStepKey: next})
}
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getNextStepKey, isValidStepKey, StepKey } from "@/lib/signupSteps";

type Body = {
    sessionId: string;
    stepKey: string;
    finalAnswer: string;
    finalSource: "orginal" | "ai_suggested" | "user_edited";
};

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

    // 2) advance session
    const next = getNextStepKey(stepKey);
    if (next) {
        const {error: sessErr} = await supabase
        .from("signup_sessions")
        .update({current_step_key: next})
        .eq("id", sessionId);

        if (sessErr) return NextResponse.json({error: sessErr.message}, {status: 500});
    }

    return NextResponse.json({ok: true, nextStepKey: next})
}
import {NextResponse} from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { isValidStepKey, SIGNUP_STEPS, StepKey } from "@/lib/signupSteps";
import type { CompleteSignupRequest } from "@/lib/types/api";

type Body = CompleteSignupRequest;
type SignupAnswerRow = {
    step_key: StepKey;
    final_answer: string | null;
    final_source: string | null;
    confirmed_at: string | null;
};
type SignupResponsePayload = Partial<
    Record<
        StepKey,
        {
            final: string | null;
            source: string | null;
            confirmedAt: string | null;
        }
    >
>;

function getRequiredSteps(interviewCount: number): StepKey[] {
    if (interviewCount === 0) {
        return SIGNUP_STEPS.filter((step) => step !== "interview_upload");
    }
    return SIGNUP_STEPS;
}

export async function POST(req: Request) {
    const supabase = createServerSupabaseClient();
    const body = (await req.json()) as Body;

    const sessionId = (body.sessionId || "").trim();
    if (!sessionId) return NextResponse.json({error: "missing sessionId"}, {status:400});

    //1) fetch answers 
    const {data: answers, error: aErr} = await supabase
    .from("signup_answers")
    .select("step_key, final_answer, final_source, confirmed_at")
    .eq("session_id", sessionId);

    if (aErr) return NextResponse.json({error: aErr.message}, {status: 500});

    const byKey: Partial<Record<StepKey, SignupAnswerRow>> = {};
        for (const a of (answers ?? []) as Array<{
            step_key?: unknown;
            final_answer?: string | null;
            final_source?: string | null;
            confirmed_at?: string | null;
        }>) {
            if (typeof a.step_key !== "string" || !isValidStepKey(a.step_key)) continue;

            byKey[a.step_key] = {
                step_key: a.step_key,
                final_answer: a.final_answer ?? null,
                final_source: a.final_source ?? null,
                confirmed_at: a.confirmed_at ?? null,
            };
        }
    
    // 2) ensure required finals exist
    const interviewCountRaw = byKey["interview_count"]?.final_answer;
    const interviewCount = Number(interviewCountRaw);
    const requiredSteps = getRequiredSteps(Number.isFinite(interviewCount) ? interviewCount : 0);

    const missing: StepKey[] = [];
    for (const k of requiredSteps) {
        const final = byKey[k]?.final_answer;
        if(!final || !String(final).trim()) missing.push(k);
    }

    if (missing.length) {
        return NextResponse.json(
            {error: "Missing final answers", missingStepKeys: missing},
            {status: 400}
        );
    }

    // 3) build final payload (final final to build tasks on after)  aka leagcy response
    const payload: SignupResponsePayload = {};
    for(const k of requiredSteps) {
        const row = byKey[k];
        if (!row) continue;

        payload[k] = {
            final: row.final_answer,
            source: row.final_source,
            confirmedAt: row.confirmed_at,
        };
    }

    // 4) upsert the leagcy response 
    const {error: upErr} = await supabase
    .from("signup_responses")
    .upsert(
        {
            session_id: sessionId,
            payload,
        },
        {onConflict: "session_id"}
    );

    if (upErr) return NextResponse.json({error: upErr.message}, {status: 500});

    // 5) mark session complete
    const {error: sErr} = await supabase
        .from("signup_sessions")
        .update({status: "completed", current_step_key: "completed"})
        .eq("id", sessionId);

        if(sErr) return NextResponse.json({error: sErr.message}, {status: 500});

        return NextResponse.json({ok: true})
}
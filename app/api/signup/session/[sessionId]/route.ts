import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function GET(
    _req: Request,
    {params}: { params: {sessionId: string} }
){
    const supabase = createServerSupabaseClient()
    const sessionId = params.sessionId

    const { data: session, error: sErr } = await supabase
        .from("signup_sessions")
        .select("id, current_step_key, status")
        .eq("id", sessionId)
        .single();

    if (sErr){
        return NextResponse.json({ error: "session not found"}, {status: 404})
    }

    const { data: answers, error: aErr } = await supabase
        .from("signup_answers")
        .select("step_key, raw_answer, final_answer")
        .eq("session_id", sessionId);

     if (aErr) {
         return NextResponse.json({ error: aErr.message }, { status: 500 });
    }

     const answersByStepKey: Record<string, string> = {};
    for (const a of answers ?? []) answersByStepKey[a.step_key] = a.raw_answer ?? "";


    return NextResponse.json({
        sessionId: session.id,
        currentStepKey: session.current_step_key,
        status: session.status,
        answersByStepKey
    })
}
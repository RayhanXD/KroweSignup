import {NextResponse} from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {

    if (process.env.NODE_ENV === "production") {
        return new NextResponse(null, {status: 404});
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            {error: "Invalid JSON"},
            {status: 400}
        );
    }

    const {sessionId} = body;

    if (!sessionId || typeof sessionId !== "string") {
        return NextResponse.json(
            {error: "Missing or invalid sessionId"},
            {status: 400}
        );
    }

    const supabase = createServerSupabaseClient();

    const {data: answers, error} = await supabase
    .from("signup_answers")
    .select("step_key, final_answer")
    .eq("session_id", sessionId);

    if (error) {
        console.error("Supabase error:", error);
        return NextResponse.json(
          { error: "Failed to load signup answers", supabase: error.message },
          { status: 500 }
        );
      }
      

    


    if(!answers || answers.length === 0){
        return NextResponse.json(
            {error: "No answers found for session"},
            {status: 404}
        );
    }
    
    return NextResponse.json({
        ok: true, 
        sessionId,
        answers
    });
}
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabaseServer"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const supabase = createServerSupabaseClient();
    const { sessionId } = await params;

    const { data, error } = await supabase
        .from("signup_reports")
        .select("id, status, report, created_at, updated_at")
        .eq("session_id", sessionId)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });

    return NextResponse.json({
        ok: true,
        reportId: data.id,
        status: data.status,
        report: data.report,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    })
}
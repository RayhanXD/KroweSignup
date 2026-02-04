import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { generateReportForSession } from "@/lib/report/generateReportForSession";
import { REPORT_VERSION } from "@/lib/constants";
import type { GenerateReportRequest } from "@/lib/types/api";

type Body = GenerateReportRequest;

const CURRENT_VERSION = REPORT_VERSION;

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = (await req.json()) as Body;

  const sessionId = (body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  // 1) If report exists, check status and version
  const { data: existing, error: exErr } = await supabase
    .from("signup_reports")
    .select("id, status, report")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (exErr) {
    console.error("Error fetching existing report:", exErr);
    // proceed to try generating, or return error?
  }

  const existingVersion = existing?.report?.version;
  const isCurrent = existingVersion === CURRENT_VERSION;
  const isReady = existing?.status === "ready";
  const isProcessing = existing?.status === "processing";

  // If it's already done (ready) and version matches, return it
  if (existing?.id && isCurrent && isReady) {
    return NextResponse.json({ ok: true, reportId: existing.id, sessionId });
  }

  // If it's currently processing (and version matches or we just trust the lock), return wait signal
  // For now, we return the reportId which allows the client to poll or wait
  if (existing?.id && isProcessing && isCurrent) {
    return NextResponse.json({ ok: true, reportId: existing.id, sessionId });
  }

  // Define a flag to know if we inserted a placeholder
  let didInsertPlaceholder = false;

  // If no report exists, try to INSERT a 'processing' placeholder.
  // We use INSERT (not upsert) to let the database handle race conditions via unique constraint on session_id.
  if (!existing?.id) {
    const { error: insertErr } = await supabase
      .from("signup_reports")
      .insert({
        session_id: sessionId,
        status: "processing",
        report: { version: CURRENT_VERSION }, // placeholder with version
      });

    if (insertErr) {
      // If error is unique constraint violation, it means another request just started it.
      // We should fetch that one and return it.
      if (insertErr.code === "23505") { // Postgres unique_violation code
        const { data: racer } = await supabase
          .from("signup_reports")
          .select("id")
          .eq("session_id", sessionId)
          .single();
        return NextResponse.json({ ok: true, reportId: racer?.id, sessionId });
      } else {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }
    didInsertPlaceholder = true;
  }
  // If it exists but is old version (legacy/outdated), we proceed to regenerate (overwrite).
  // Note: Race condition still possible here for *updates*, but less critical than initial creation.

  // 2) Generate report using shared pipeline (includes all LLM enrichment)
  try {
    const result = await generateReportForSession(sessionId, { reason: "generate" });

    // Fetch the report ID if we didn't get it from the result
    let reportId = result.reportId;
    if (!reportId) {
      const { data: freshReport } = await supabase
        .from("signup_reports")
        .select("id")
        .eq("session_id", sessionId)
        .single();
      reportId = freshReport?.id;
    }

    return NextResponse.json({
      ok: true,
      reportId: reportId ?? existing?.id,
      sessionId,
      updatedAt: result.updatedAt,
    });
  } catch (error: any) {
    console.error("[generate] Report generation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Report generation failed" },
      { status: 500 }
    );
  }
}

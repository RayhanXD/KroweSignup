import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { generateReportForSession } from "@/lib/report/generateReportForSession";
import { REPORT_VERSION } from "@/lib/constants";
import type { GenerateReportRequest } from "@/lib/types/api";

export const maxDuration = 300;

type Body = GenerateReportRequest;

const CURRENT_VERSION = REPORT_VERSION;
const PROCESSING_STALE_MS = 10 * 60 * 1000;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function logGenerateRoute(sessionId: string, requestStartedAt: number, message: string) {
  console.log(`[generate] ${message} (sessionId=${sessionId}, elapsedMs=${elapsedMs(requestStartedAt)})`);
}

async function markReportFailed(sessionId: string, error: unknown) {
  const supabase = createServerSupabaseClient();
  const message = getErrorMessage(error, "Report generation failed");

  const { error: updateErr } = await supabase
    .from("signup_reports")
    .upsert(
      {
        session_id: sessionId,
        status: "failed",
        report: { version: CURRENT_VERSION, error: message },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

  if (updateErr) {
    console.error("[generate] Failed to mark report as failed:", updateErr);
  }
}

function enqueueReportGeneration(sessionId: string, requestStartedAt: number) {
  const backgroundStartedAt = Date.now();
  console.log(`[generate] Background report generation started (sessionId=${sessionId})`);

  waitUntil(
    generateReportForSession(sessionId, { reason: "generate" })
      .then((result) => {
        logGenerateRoute(sessionId, requestStartedAt, `Background completed: ${result.updatedAt}`);
      })
      .catch(async (error: unknown) => {
        console.error(`[generate] Background failed (sessionId=${sessionId}):`, error);
        await markReportFailed(sessionId, error);
      })
  );
}

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const requestStartedAt = Date.now();
  const body = (await req.json()) as Body;

  const sessionId = (body.sessionId || "").trim();
  if (!sessionId) {
    console.log(`[generate] Missing sessionId (elapsedMs=${elapsedMs(requestStartedAt)})`);
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  // 1) If report exists, check status and version
  const { data: existing, error: exErr } = await supabase
    .from("signup_reports")
    .select("id, status, report, updated_at")
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
  const lastUpdatedMs = existing?.updated_at ? Date.parse(existing.updated_at) : NaN;
  const isStaleProcessing =
    isProcessing &&
    Number.isFinite(lastUpdatedMs) &&
    Date.now() - lastUpdatedMs > PROCESSING_STALE_MS;

  // If it's already done (ready) and version matches, return it
  if (existing?.id && isCurrent && isReady) {
    logGenerateRoute(sessionId, requestStartedAt, "Returning existing ready report");
    return NextResponse.json({ ok: true, reportId: existing.id, sessionId, status: "ready" });
  }

  // If it's currently processing and not stale, return immediately.
  if (existing?.id && isProcessing && isCurrent && !isStaleProcessing) {
    logGenerateRoute(sessionId, requestStartedAt, "Report already processing, returning immediately");
    return NextResponse.json({ ok: true, reportId: existing.id, sessionId, status: "processing" });
  }

  let reportId = existing?.id;

  // If no report exists, try to INSERT a 'processing' placeholder.
  // We use INSERT (not upsert) to let the database handle race conditions via unique constraint on session_id.
  if (!existing?.id) {
    const { data: inserted, error: insertErr } = await supabase
      .from("signup_reports")
      .insert({
        session_id: sessionId,
        status: "processing",
        report: { version: CURRENT_VERSION }, // placeholder with version
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      // If error is unique constraint violation, it means another request just started it.
      // We should fetch that one and return it.
      if (insertErr.code === "23505") { // Postgres unique_violation code
        const { data: racer } = await supabase
          .from("signup_reports")
          .select("id, status")
          .eq("session_id", sessionId)
          .single();

        return NextResponse.json({
          ok: true,
          reportId: racer?.id,
          sessionId,
          status: racer?.status ?? "processing",
        });
      } else {
        logGenerateRoute(sessionId, requestStartedAt, "Insert failed while creating processing placeholder");
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }
    reportId = inserted?.id;
    logGenerateRoute(sessionId, requestStartedAt, "Inserted processing placeholder");
  } else if (!isReady || !isCurrent || isStaleProcessing) {
    // Existing row is stale/outdated/incomplete - reset to processing and regenerate.
    const { error: updateErr } = await supabase
      .from("signup_reports")
      .update({
        status: "processing",
        report: { version: CURRENT_VERSION },
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (updateErr) {
      logGenerateRoute(sessionId, requestStartedAt, "Failed to reset report to processing");
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    logGenerateRoute(sessionId, requestStartedAt, "Reset existing report to processing");
  }

  // 2) Kick off generation in background and return immediately.
  enqueueReportGeneration(sessionId, requestStartedAt);
  logGenerateRoute(sessionId, requestStartedAt, "Enqueued background generation and returning processing");

  return NextResponse.json({
    ok: true,
    reportId: reportId ?? existing?.id,
    sessionId,
    status: "processing",
  });
}

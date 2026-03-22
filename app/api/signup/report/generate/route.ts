import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { generateReportForSession } from "@/lib/report/generateReportForSession";
import { generateCurriculumForSession } from "@/lib/curriculum/generateCurriculumForSession";
import { CURRICULUM_JSON_VERSION } from "@/lib/curriculum/constants";
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

function isStaleProcessing(updatedAt: string | null | undefined, staleMs: number): boolean {
  if (!updatedAt) return true;
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > staleMs;
}

type ReportRow = {
  id: string;
  status: string;
  report: { version?: string } | null;
  updated_at: string | null;
};

type CurriculumRow = {
  id: string;
  status: string;
  curriculum_version: string;
  updated_at: string | null;
};

function shouldRunReport(existing: ReportRow | null): boolean {
  if (!existing?.id) return true;
  if (existing.status === "ready" && existing.report?.version === CURRENT_VERSION) return false;
  if (existing.status === "processing" && !isStaleProcessing(existing.updated_at, PROCESSING_STALE_MS)) {
    return false;
  }
  return true;
}

function shouldRunCurriculum(existing: CurriculumRow | null): boolean {
  if (!existing?.id) return true;
  if (existing.status === "ready" && existing.curriculum_version === CURRICULUM_JSON_VERSION) return false;
  if (existing.status === "processing" && !isStaleProcessing(existing.updated_at, PROCESSING_STALE_MS)) {
    return false;
  }
  return true;
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

async function markCurriculumFailed(sessionId: string, error: unknown) {
  const supabase = createServerSupabaseClient();
  const message = getErrorMessage(error, "Curriculum generation failed");

  const { error: updateErr } = await supabase.from("signup_curricula").upsert(
    {
      session_id: sessionId,
      status: "failed",
      curriculum_version: CURRICULUM_JSON_VERSION,
      error: message,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );

  if (updateErr) {
    console.error("[generate] Failed to mark curriculum as failed:", updateErr);
  }
}

async function upsertRoadmapProgress(sessionId: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("signup_roadmap_progress").upsert(
    {
      session_id: sessionId,
      unlocked_stage_max: 1,
      completed_task_ids: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );
  if (error) {
    console.error("[generate] Failed to upsert signup_roadmap_progress:", error);
  } else {
    console.log(`[generate] signup_roadmap_progress upsert ok (sessionId=${sessionId})`);
  }
}

function enqueueSignupEnrichment(
  sessionId: string,
  runReport: boolean,
  runCurriculum: boolean,
  requestStartedAt: number
) {
  const backgroundStartedAt = Date.now();
  console.log(
    `[generate] Background enrichment started (sessionId=${sessionId}, runReport=${runReport}, runCurriculum=${runCurriculum})`
  );

  waitUntil(
    Promise.allSettled([
      runReport
        ? generateReportForSession(sessionId, { reason: "generate" })
        : Promise.resolve(null),
      runCurriculum
        ? generateCurriculumForSession(sessionId, { reason: "generate" })
        : Promise.resolve(null),
    ]).then(async (results) => {
      const [repResult, curResult] = results;
      if (repResult.status === "fulfilled" && repResult.value) {
        const v = repResult.value as Awaited<ReturnType<typeof generateReportForSession>>;
        console.log(
          `[generate] Report OK (sessionId=${sessionId}, durationMs=${elapsedMs(backgroundStartedAt)}, updatedAt=${v.updatedAt})`
        );
        logGenerateRoute(
          sessionId,
          requestStartedAt,
          `Background report completed: ${v.updatedAt}`
        );
      } else if (repResult.status === "rejected") {
        const err = repResult.reason;
        console.error(
          `[generate] Report failed (sessionId=${sessionId}, durationMs=${elapsedMs(backgroundStartedAt)}):`,
          err
        );
        await markReportFailed(sessionId, err);
      }

      if (curResult.status === "fulfilled" && curResult.value) {
        const v = curResult.value as Awaited<ReturnType<typeof generateCurriculumForSession>>;
        console.log(
          `[generate] Curriculum OK (sessionId=${sessionId}, durationMs=${elapsedMs(backgroundStartedAt)}, updatedAt=${v.updatedAt})`
        );
      } else if (curResult.status === "rejected") {
        const err = curResult.reason;
        console.error(
          `[generate] Curriculum failed (sessionId=${sessionId}, durationMs=${elapsedMs(backgroundStartedAt)}):`,
          err
        );
        await markCurriculumFailed(sessionId, err);
      }

      console.log(
        `[generate] Background enrichment settled (sessionId=${sessionId}, totalMs=${elapsedMs(backgroundStartedAt)})`
      );
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

  // Run first so every path (including duplicate POST / report insert race 23505 early return)
  // still creates roadmap progress for this session.
  await upsertRoadmapProgress(sessionId);

  const { data: existing, error: exErr } = await supabase
    .from("signup_reports")
    .select("id, status, report, updated_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (exErr) {
    console.error("Error fetching existing report:", exErr);
  }

  const { data: existingCurriculum, error: curErr } = await supabase
    .from("signup_curricula")
    .select("id, status, curriculum_version, updated_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (curErr) {
    console.error("Error fetching existing curriculum:", curErr);
  }

  const rep = existing as ReportRow | null;
  const cur = existingCurriculum as CurriculumRow | null;

  const runRep = shouldRunReport(rep);
  const runCur = shouldRunCurriculum(cur);

  // Neither side needs a fresh run — either both done or mid-flight
  if (!runRep && !runCur) {
    const repBusy =
      rep?.status === "processing" && !isStaleProcessing(rep?.updated_at, PROCESSING_STALE_MS);
    const curBusy =
      cur?.status === "processing" && !isStaleProcessing(cur?.updated_at, PROCESSING_STALE_MS);
    if (repBusy || curBusy) {
      logGenerateRoute(
        sessionId,
        requestStartedAt,
        "Report and/or curriculum already processing, returning immediately"
      );
      return NextResponse.json({
        ok: true,
        reportId: rep?.id,
        sessionId,
        status: "processing",
      });
    }
    logGenerateRoute(sessionId, requestStartedAt, "No regeneration needed; returning ready");
    return NextResponse.json({
      ok: true,
      reportId: rep?.id,
      sessionId,
      status: "ready",
    });
  }

  let reportId = rep?.id;

  // Report placeholder (insert or reset to processing)
  if (runRep) {
    if (!rep?.id) {
      const { data: inserted, error: insertErr } = await supabase
        .from("signup_reports")
        .insert({
          session_id: sessionId,
          status: "processing",
          report: { version: CURRENT_VERSION },
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr) {
        if (insertErr.code === "23505") {
          const { data: racer } = await supabase
            .from("signup_reports")
            .select("id, status")
            .eq("session_id", sessionId)
            .single();

          logGenerateRoute(
            sessionId,
            requestStartedAt,
            "Report placeholder race (23505); other request owns generation — returning"
          );
          return NextResponse.json({
            ok: true,
            reportId: racer?.id,
            sessionId,
            status: racer?.status ?? "processing",
          });
        }
        logGenerateRoute(sessionId, requestStartedAt, "Insert failed while creating report placeholder");
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      reportId = inserted?.id;
      logGenerateRoute(sessionId, requestStartedAt, "Inserted report processing placeholder");
    } else {
      const isReady = rep.status === "ready";
      const isCurrent = rep.report?.version === CURRENT_VERSION;
      const isProcessing = rep.status === "processing";
      const lastUpdatedMs = rep.updated_at ? Date.parse(rep.updated_at) : NaN;
      const isStaleProcessingRep =
        isProcessing &&
        Number.isFinite(lastUpdatedMs) &&
        Date.now() - lastUpdatedMs > PROCESSING_STALE_MS;

      if (!isReady || !isCurrent || isStaleProcessingRep) {
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
    }
  }

  // Curriculum placeholder
  if (runCur) {
    if (!cur?.id) {
      const { error: cIns } = await supabase
        .from("signup_curricula")
        .insert({
          session_id: sessionId,
          status: "processing",
          curriculum_version: CURRICULUM_JSON_VERSION,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (cIns) {
        if (cIns.code === "23505") {
          logGenerateRoute(sessionId, requestStartedAt, "Curriculum row race; continuing");
        } else {
          logGenerateRoute(sessionId, requestStartedAt, "Insert failed for curriculum placeholder");
          return NextResponse.json({ error: cIns.message }, { status: 500 });
        }
      } else {
        logGenerateRoute(sessionId, requestStartedAt, "Inserted curriculum processing placeholder");
      }
    } else {
      const { error: cUp } = await supabase
        .from("signup_curricula")
        .update({
          status: "processing",
          curriculum_version: CURRICULUM_JSON_VERSION,
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId);

      if (cUp) {
        logGenerateRoute(sessionId, requestStartedAt, "Failed to reset curriculum to processing");
        return NextResponse.json({ error: cUp.message }, { status: 500 });
      }
      logGenerateRoute(sessionId, requestStartedAt, "Reset curriculum to processing");
    }
  }

  enqueueSignupEnrichment(sessionId, runRep, runCur, requestStartedAt);
  logGenerateRoute(sessionId, requestStartedAt, "Enqueued background enrichment and returning processing");

  return NextResponse.json({
    ok: true,
    reportId: reportId ?? rep?.id,
    sessionId,
    status: "processing",
  });
}

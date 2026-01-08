import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { buildReportFromPayload } from "@/lib/report/buildReport";
import { findCompetitorsViaWeb } from "@/lib/report/findCompetitors";
import { estimateMvpCostViaLLM } from "@/lib/report/estimateMvpCost";
import { estimateMarketSizeLLM } from "@/lib/report/marketsize";


type Body = { sessionId: string };

const CURRENT_VERSION = "6.2.2";

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


  // 2) Pull payload from legacy backfill
  const { data: legacy, error: legErr } = await supabase
    .from("signup_responses")
    .select("payload")
    .eq("session_id", sessionId)
    .single();

  if (legErr) return NextResponse.json({ error: legErr.message }, { status: 500 });

  // Pull these from your payload (adjust keys if yours differ)
  const idea = legacy?.payload?.idea?.final ?? null;
  const industry = legacy?.payload?.industry?.final ?? null;
  const targetCustomer = legacy?.payload?.target_customer?.final ?? null;
  const problem = legacy?.payload?.problem?.final ?? null;
  const productType = legacy?.payload?.product_type?.final ?? null;
  const teamSize = legacy?.payload?.team_size?.final ?? null;
  const hoursPerWeek = legacy?.payload.hours?.final ?? null;
  const existingMarketSize = existing?.report?.marketSize ?? null;

  //Mvp costs section
  let costEstimate: any = null;
  let mvpCostEstimateError: string | undefined;
  let marketSize = existingMarketSize;


  //mvp function
  if (idea) {
    try {
      costEstimate = await estimateMvpCostViaLLM({
        idea,
        industry,
        productType,
        targetCustomer,
        teamSize,
        hoursPerWeek,
      });
    } catch (e: any) {
      costEstimate = null;
      mvpCostEstimateError = e?.message || "Failed to estimate cost";
    }
  }

  //fetch competitors first 
  let competitors: any[] = [];
  let competitorError: string | undefined;

  // Only do the web competitor search if we have enough info
  if (idea && industry) {
    try {
      const res = await findCompetitorsViaWeb({ idea, industry, targetCustomer });
      competitors = res.competitors ?? [];
    } catch (e: any) {
      competitorError = e?.message || "competitor search failed";
      competitors = [];
    }
  }

  //market size function
  if (!marketSize) {
    marketSize = await estimateMarketSizeLLM({
      idea,
      problem,
      targetCustomer,
      industry,
      competitors: (competitors ?? []).map((c) => ({ name: c.name })),
    })
  }

  //4) buld report from payload + competitors
  // Ensure we pass the CURRENT_VERSION if buildReportFromPayload needs it, or it uses its own.
  // Assuming buildReportFromPayload attaches the version, but we should make sure.
  const reportObj = buildReportFromPayload(legacy.payload, { competitors, competitorError, costEstimate, mvpCostEstimateError, marketSize });

  // Explicitly set/override version to match our constant
  // (depending on buildReportFromPayload implementation, it might vary, but we want consistency)
  if (reportObj) {
    (reportObj as any).version = CURRENT_VERSION;
  }

  // 4) Store the report (✅ correct table + column names)
  // Use ignoreDuplicates: true to handle race conditions where another request created it 
  // between our check at (1) and this insert.
  const { data: upserted, error: insErr } = await supabase
    .from("signup_reports")
    .upsert(
      {
        session_id: sessionId,
        status: "ready",
        report: reportObj,
      },
      { onConflict: "session_id" }
    )
    .select("id")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // If upserted is null (due to ignoreDuplicates), fetch the existing record


  return NextResponse.json({ ok: true, reportId: upserted?.id ?? existing?.id, sessionId });
}

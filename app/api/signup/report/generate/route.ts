import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { buildReportFromPayload } from "@/lib/report/buildReport";
import { findCompetitorsViaWeb } from "@/lib/report/findCompetitors";

type Body = { sessionId: string };

const CURRENT_VERSION = "6.2.2";

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = (await req.json()) as Body;

  const sessionId = (body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  // 1) If report already exists, return it (idempotent)
  const { data: existing, error: exErr } = await supabase
    .from("signup_reports")
    .select("id, report")
    .eq("session_id", sessionId)
    .maybeSingle();

  const existiingVersion = existing?.report?.version;

  if (existing?.id && existiingVersion === "CURRENT_VERSION") {
    return NextResponse.json({ ok: true, reportId: existing.id, sessionId });
  }
  //if it exist but is old we will regerenate and overwrite
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 }); //maybe delete?
  if (existing?.id) {
    return NextResponse.json({ ok: true, reportId: existing.id, sessionId });
  }

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

  //fetch competitors first 
  let competitors: any [] = [];

  // Only do the web competitor search if we have enough info
  if (idea && industry) {
    try {
     const res = await findCompetitorsViaWeb({ idea, industry, targetCustomer });
     competitors = res.competitors ?? [];
    } catch  {
      competitors = [];
    }
  } 

  //4) buld report from payload + competitors
  const reportObj = buildReportFromPayload(legacy.payload, { competitors, competitorError: undefined });

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
      { onConflict: "session_id"}
    )
    .select("id")
    .maybeSingle();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // If upserted is null (due to ignoreDuplicates), fetch the existing record


  return NextResponse.json({ ok: true, reportId: upserted?.id ?? existing?.id, sessionId });
}

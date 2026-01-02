import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

type Body = { sessionId: string };

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
    .select("id, status")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
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

  // 3) Skeleton report (Slice 6.1)
  const report = {
    version: "6.1-skeleton",
    generatedAt: new Date().toISOString(),
    inputsSnapshot: legacy?.payload ?? {},
    sections: {
      timeToMvp: { status: "todo" },
      founderFit: { status: "todo" },
      startupAdvantage: { status: "todo" },
      thingsNeeded: { status: "todo" },
      marketSnapshot: { status: "todo" },
      roadmap: { status: "todo" },
      pivot: { status: "todo" },
    },
  };

  // 4) Store the report (✅ correct table + column names)

  // Use ignoreDuplicates: true to handle race conditions where another request created it 
  // between our check at (1) and this insert.
  const { data: upserted, error: insErr } = await supabase
    .from("signup_reports")
    .upsert(
      {
        session_id: sessionId,
        status: "ready",
        report,
      },
      { onConflict: "session_id", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // If upserted is null (due to ignoreDuplicates), fetch the existing record
  let reportId = upserted?.id;
  if (!reportId) {
    const { data: retry } = await supabase
      .from("signup_reports")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (retry?.id) {
      reportId = retry.id;
    } else {
      // Only happens if logic is very weird (deleted right after creation?)
      return NextResponse.json({ error: "Context conflict: Could not create or find report" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, reportId, sessionId });
}

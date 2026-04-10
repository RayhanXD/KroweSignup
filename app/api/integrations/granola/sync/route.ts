import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { ensureGranolaImportsEnabled } from "@/lib/featureFlags";
import { syncGranolaInbox } from "@/lib/integrations/granola/sync";

function hasCronSecret(req: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const provided = req.headers.get("x-cron-secret")?.trim();
  return Boolean(provided && provided === expected);
}

export async function POST(_req: Request) {
  try {
    ensureGranolaImportsEnabled();
  } catch {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
  }

  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await syncGranolaInbox({
      supabase,
      userId: user.id,
      triggerSource: "manual",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    ensureGranolaImportsEnabled();
  } catch {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
  }

  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data: connections, error } = await supabase
    .from("granola_connections")
    .select("user_id")
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
  for (const connection of connections ?? []) {
    try {
      await syncGranolaInbox({
        supabase,
        userId: connection.user_id,
        triggerSource: "scheduled",
      });
      results.push({ userId: connection.user_id, ok: true });
    } catch (syncErr) {
      const message = syncErr instanceof Error ? syncErr.message : "Sync failed";
      results.push({ userId: connection.user_id, ok: false, error: message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

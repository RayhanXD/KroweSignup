import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptGranolaApiKey } from "./crypto";
import { getGranolaNote, listGranolaNotes } from "./client";
import { normalizeGranolaNote } from "./normalize";

type TriggerSource = "manual" | "scheduled";

type SyncParams = {
  supabase: SupabaseClient;
  userId: string;
  triggerSource: TriggerSource;
};

type ConnectionRow = {
  id: string;
  encrypted_api_key: string;
  status: "active" | "invalid" | "disabled";
  last_synced_note_updated_at: string | null;
};

export async function syncGranolaInbox({
  supabase,
  userId,
  triggerSource,
}: SyncParams): Promise<{ scanned: number; upserted: number; skipped: number }> {
  console.log(`[granola-sync] start user=${userId} trigger=${triggerSource}`);
  const { data: connection, error: connErr } = await supabase
    .from("granola_connections")
    .select("id, encrypted_api_key, status, last_synced_note_updated_at")
    .eq("user_id", userId)
    .single<ConnectionRow>();

  if (connErr || !connection) throw new Error("Granola connection not found");
  if (connection.status !== "active") throw new Error("Granola connection is not active");

  const apiKey = decryptGranolaApiKey(connection.encrypted_api_key);
  const runStart = new Date().toISOString();

  const { data: run } = await supabase
    .from("granola_sync_runs")
    .insert({
      connection_id: connection.id,
      user_id: userId,
      trigger_source: triggerSource,
      status: "started",
      started_at: runStart,
    })
    .select("id")
    .single();

  let scanned = 0;
  let upserted = 0;
  let skipped = 0;
  let cursor: string | undefined;
  let hasMore = true;
  let newestUpdatedAt = connection.last_synced_note_updated_at;

  await supabase
    .from("granola_connections")
    .update({ last_sync_started_at: runStart, last_error: null, updated_at: runStart })
    .eq("id", connection.id)
    .eq("user_id", userId);

  try {
    while (hasMore) {
      const page = await listGranolaNotes(apiKey, {
        pageSize: 30,
        cursor,
        updatedAfter: connection.last_synced_note_updated_at ?? undefined,
      });

      hasMore = page.hasMore;
      cursor = page.cursor ?? undefined;

      for (const summary of page.notes) {
        scanned += 1;
        const { data: existing } = await supabase
          .from("granola_inbox_items")
          .select("id, assignment_status, granola_updated_at")
          .eq("user_id", userId)
          .eq("external_note_id", summary.id)
          .maybeSingle();

        if (
          existing &&
          existing.assignment_status === "assigned" &&
          new Date(existing.granola_updated_at).getTime() >=
            new Date(summary.updated_at).getTime()
        ) {
          skipped += 1;
          continue;
        }

        const note = await getGranolaNote(apiKey, summary.id);
        const normalized = normalizeGranolaNote(note);

        if (normalized.normalized_text.trim().length < 100) {
          skipped += 1;
          continue;
        }

        const { error: upsertErr } = await supabase.from("granola_inbox_items").upsert(
          {
            user_id: userId,
            connection_id: connection.id,
            ...normalized,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,external_note_id" }
        );

        if (upsertErr) {
          throw new Error(upsertErr.message);
        }
        upserted += 1;

        if (
          !newestUpdatedAt ||
          new Date(summary.updated_at).getTime() > new Date(newestUpdatedAt).getTime()
        ) {
          newestUpdatedAt = summary.updated_at;
        }
      }
    }

    const finishedAt = new Date().toISOString();
    await Promise.all([
      supabase
        .from("granola_connections")
        .update({
          last_sync_completed_at: finishedAt,
          last_synced_note_updated_at: newestUpdatedAt,
          last_sync_cursor: cursor ?? null,
          last_error: null,
          updated_at: finishedAt,
        })
        .eq("id", connection.id)
        .eq("user_id", userId),
      run?.id
        ? supabase
            .from("granola_sync_runs")
            .update({
              status: "completed",
              notes_scanned: scanned,
              notes_upserted: upserted,
              notes_skipped: skipped,
              completed_at: finishedAt,
            })
            .eq("id", run.id)
        : Promise.resolve(),
    ]);

    console.log(
      `[granola-sync] completed user=${userId} scanned=${scanned} upserted=${upserted} skipped=${skipped}`
    );
    return { scanned, upserted, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Granola sync failed";
    const failedAt = new Date().toISOString();
    await Promise.all([
      supabase
        .from("granola_connections")
        .update({
          status: message.includes("401") ? "invalid" : connection.status,
          last_error: message,
          updated_at: failedAt,
        })
        .eq("id", connection.id)
        .eq("user_id", userId),
      run?.id
        ? supabase
            .from("granola_sync_runs")
            .update({
              status: "failed",
              notes_scanned: scanned,
              notes_upserted: upserted,
              notes_skipped: skipped,
              error_message: message,
              completed_at: failedAt,
            })
            .eq("id", run.id)
        : Promise.resolve(),
    ]);
    console.error(`[granola-sync] failed user=${userId}: ${message}`);
    throw error;
  }
}

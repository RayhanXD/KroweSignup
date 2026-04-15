import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { ensureGranolaImportsEnabled } from "@/lib/featureFlags";
import {
  encryptGranolaApiKey,
  granolaKeyHint,
} from "@/lib/integrations/granola/crypto";
import { verifyGranolaConnection } from "@/lib/integrations/granola/client";

export async function GET() {
  try {
    ensureGranolaImportsEnabled();
  } catch {
    return NextResponse.json({ enabled: false, connection: null });
  }

  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("granola_connections")
    .select(
      "id, status, key_hint, last_sync_started_at, last_sync_completed_at, last_error, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enabled: true, connection: data ?? null });
}

export async function POST(req: Request) {
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

  const body = await req.json();
  const apiKey = String(body.apiKey ?? "").trim();
  if (!apiKey) return NextResponse.json({ error: "Missing apiKey" }, { status: 400 });

  try {
    await verifyGranolaConnection(apiKey);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify Granola API key";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error } = await supabase.from("granola_connections").upsert(
    {
      user_id: user.id,
      encrypted_api_key: encryptGranolaApiKey(apiKey),
      key_hint: granolaKeyHint(apiKey),
      status: "active",
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
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

  const { error } = await supabase
    .from("granola_connections")
    .update({
      status: "disabled",
      encrypted_api_key: encryptGranolaApiKey(`disabled_${Date.now()}`),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

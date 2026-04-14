import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { scrapeAndPersistOnboardingFromUrl } from "@/lib/signup/scrapeOnboarding";

type PatchBody = {
  url?: string;
};

function validateHttpUrl(input: string): string | null {
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectRes = await supabase
    .from("interview_projects")
    .select("id, session_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectRes.error || !projectRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json()) as PatchBody;
  const urlInput = (body.url ?? "").trim();
  if (!urlInput) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const sourceUrl = validateHttpUrl(urlInput);
  if (!sourceUrl) {
    return NextResponse.json({ error: "Invalid URL. Use a valid http/https address." }, { status: 400 });
  }

  const sessionId = (projectRes.data.session_id ?? "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Project has no signup session linked" }, { status: 422 });
  }

  const scrapeResult = await scrapeAndPersistOnboardingFromUrl(sessionId, sourceUrl, "user_edited");
  if (!scrapeResult.ok) {
    return NextResponse.json({ error: scrapeResult.error }, { status: scrapeResult.status });
  }

  const completedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("interview_projects")
    .update({
      onboarding_mode: "webscraper",
      onboarding_completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    onboarding: {
      mode: "webscraper",
      completedAt,
      sourceUrl: scrapeResult.sourceUrl,
      sourceUpdatedAt: scrapeResult.sourceUpdatedAt,
    },
  });
}

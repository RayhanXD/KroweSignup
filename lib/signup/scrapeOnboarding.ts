import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getUrlOnboardingScrapeMaxChars,
  getUrlOnboardingScrapeTimeoutMs,
} from "@/lib/env";
import { extractOnboardingFromUrlContent } from "@/lib/signup/extractFromUrl";
import {
  mapExtractedModelOutputToDraft,
  serializeStepValue,
  URL_ONBOARDING_STEP_KEYS,
  type UrlOnboardingDraft,
} from "@/lib/signup/urlOnboarding";
import type { FinalAnswerSource } from "@/lib/types/answers";

type ScrapePersistError = {
  ok: false;
  status: number;
  error: string;
};

type ScrapePersistSuccess = {
  ok: true;
  draft: UrlOnboardingDraft;
  sourceUrl: string;
  sourceUpdatedAt: string;
};

export type ScrapePersistResult = ScrapePersistSuccess | ScrapePersistError;

function validateHttpUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "KroweSignup/1.0",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function buildUpsertRows(
  sessionId: string,
  draft: UrlOnboardingDraft,
  finalSource: FinalAnswerSource,
  nowIso: string
) {
  return URL_ONBOARDING_STEP_KEYS.map((stepKey) => {
    const serialized = serializeStepValue(stepKey, draft);
    return {
      session_id: sessionId,
      step_key: stepKey,
      raw_answer: serialized,
      final_answer: serialized,
      final_source: finalSource,
      confirmed_at: nowIso,
    };
  });
}

export async function writeUrlOnboardingDraftToSession(
  sessionId: string,
  draft: UrlOnboardingDraft,
  finalSource: FinalAnswerSource,
  options?: { sourceUrl?: string | null }
): Promise<ScrapePersistResult> {
  const supabase = createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const rows = buildUpsertRows(sessionId, draft, finalSource, nowIso);

  const { error: upsertError } = await supabase
    .from("signup_answers")
    .upsert(rows, { onConflict: "session_id,step_key" });

  if (upsertError) {
    return { ok: false, status: 500, error: upsertError.message };
  }

  const sourceUrl = options?.sourceUrl?.trim() ? options.sourceUrl.trim() : null;
  const updatePayload: Record<string, string> = {
    current_step_key: "startup_stage",
  };
  if (sourceUrl) {
    updatePayload.onboarding_source_url = sourceUrl;
    updatePayload.onboarding_source_updated_at = nowIso;
  }

  const { error: sessionError } = await supabase
    .from("signup_sessions")
    .update(updatePayload)
    .eq("id", sessionId);

  if (sessionError) {
    return { ok: false, status: 500, error: sessionError.message };
  }

  return {
    ok: true,
    draft,
    sourceUrl: sourceUrl ?? "",
    sourceUpdatedAt: nowIso,
  };
}

export async function scrapeAndPersistOnboardingFromUrl(
  sessionId: string,
  urlInput: string,
  finalSource: FinalAnswerSource = "ai_suggested"
): Promise<ScrapePersistResult> {
  const parsedUrl = validateHttpUrl(urlInput);
  if (!parsedUrl) {
    return { ok: false, status: 400, error: "Invalid URL. Use a valid http/https address." };
  }

  const timeoutMs = getUrlOnboardingScrapeTimeoutMs();
  const maxChars = getUrlOnboardingScrapeMaxChars();
  const readerUrl = `https://r.jina.ai/${parsedUrl.toString()}`;

  let readerResponse: Response;
  try {
    readerResponse = await fetchWithTimeout(readerUrl, timeoutMs);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, status: 408, error: "Could not reach that URL in time." };
    }
    return { ok: false, status: 502, error: "Failed to fetch website content" };
  }

  if (!readerResponse.ok) {
    return { ok: false, status: 422, error: "Could not fetch readable content from that URL" };
  }

  const pageContent = (await readerResponse.text()).trim();
  if (!pageContent) {
    return { ok: false, status: 422, error: "No readable content found at that URL" };
  }

  const boundedContent = pageContent.slice(0, maxChars);

  try {
    const extracted = await extractOnboardingFromUrlContent(boundedContent, parsedUrl.toString());
    const draft = mapExtractedModelOutputToDraft(extracted);
    const writeResult = await writeUrlOnboardingDraftToSession(
      sessionId,
      draft,
      finalSource,
      { sourceUrl: parsedUrl.toString() }
    );
    return writeResult;
  } catch (error) {
    console.error("[signup/scrape] extraction failed:", error);
    return { ok: false, status: 422, error: "Failed to extract onboarding data from that website" };
  }
}

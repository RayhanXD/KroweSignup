import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { getRetoolFeedbackWebhookConfig } from "@/lib/env";
import {
  buildRetoolFeedbackPayload,
  type FeedbackDetails,
} from "@/lib/interviews/feedbackPayload";

type FeedbackBody = {
  category?: unknown;
  rating?: unknown;
  message?: unknown;
  pagePath?: unknown;
  projectId?: unknown;
  details?: {
    whatHappened?: unknown;
    wouldRecommend?: unknown;
  };
};

function toNonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const intValue = Math.floor(value);
  if (intValue < 1 || intValue > 5) return null;
  return intValue;
}

function toDetails(value: FeedbackBody["details"]): FeedbackDetails | null {
  const details = value ?? {};
  const whatHappened = toNonEmptyString(details.whatHappened);
  const rawRecommend = toNonEmptyString(details.wouldRecommend);
  const validRecommendAnswers = ["yes", "not_yet"] as const;
  const wouldRecommend = (validRecommendAnswers as readonly string[]).includes(rawRecommend)
    ? (rawRecommend as "yes" | "not_yet")
    : null;

  if (!whatHappened) return null;

  return { whatHappened, wouldRecommend };
}

async function sendWebhookWithRetry(payload: ReturnType<typeof buildRetoolFeedbackPayload>) {
  const webhookConfig = getRetoolFeedbackWebhookConfig();

  const sendOnce = async (): Promise<void> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), webhookConfig.timeoutMs);
    try {
      const response = await fetch(webhookConfig.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workflow-Api-Key": webhookConfig.secret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        throw new Error(
          `Webhook failed with status ${response.status}${responseText ? `: ${responseText}` : ""}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    await sendOnce();
    return;
  } catch {
    await sendOnce();
  }
}

export async function POST(req: Request) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as FeedbackBody;
  const category = toNonEmptyString(body.category);
  const message = toNonEmptyString(body.message);
  const pagePath = toNonEmptyString(body.pagePath);
  const projectId = toNonEmptyString(body.projectId) || null;
  const rating = toRating(body.rating);
  const details = toDetails(body.details);

  if (!category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (!pagePath) {
    return NextResponse.json({ error: "Missing page path context" }, { status: 400 });
  }
  if (rating === null) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }
  if (!details) {
    return NextResponse.json(
      { error: "Please describe what happened" },
      { status: 400 }
    );
  }

  if (projectId) {
    const { data: ownedProject, error: projectErr } = await supabase
      .from("interview_projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .maybeSingle();

    if (projectErr) return NextResponse.json({ error: projectErr.message }, { status: 500 });
    if (!ownedProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  const submitterName =
    toNonEmptyString((user.user_metadata?.full_name as string | undefined) ?? "") ||
    toNonEmptyString((user.user_metadata?.name as string | undefined) ?? "") ||
    null;
  const submitterEmail = toNonEmptyString(user.email ?? "") || null;

  const { data: inserted, error: insertErr } = await supabase
    .from("product_feedback")
    .insert({
      category,
      message,
      rating,
      page_path: pagePath,
      project_id: projectId,
      submitter_user_id: user.id,
      submitter_name_snapshot: submitterName,
      submitter_email_snapshot: submitterEmail,
      details,
    })
    .select("id, created_at")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? "Could not save feedback" }, { status: 500 });
  }

  const payload = buildRetoolFeedbackPayload({
    feedbackId: inserted.id,
    createdAt: inserted.created_at,
    category,
    rating,
    message,
    submitterUserId: user.id,
    submitterName,
    submitterEmail,
    pagePath,
    projectId,
    appEnv: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV || "development",
    details,
  });

  try {
    await sendWebhookWithRetry(payload);
  } catch {
    return NextResponse.json(
      {
        error: "Feedback saved, but notification failed after retry.",
        saved: true,
        feedbackId: inserted.id,
        notifyStatus: "failed",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    feedbackId: inserted.id,
    notifyStatus: "sent",
  });
}

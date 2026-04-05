import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { notFound } from "next/navigation";
import InterviewDetailClient from "./InterviewDetailClient";

export const dynamic = "force-dynamic";

function isMissingMethodsColumnsError(message: string): boolean {
  return (
    message.includes("competitors_used") ||
    message.includes("current_methods") ||
    message.includes("alternatives_used")
  );
}

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; interviewId: string }>;
}) {
  const { projectId, interviewId } = await params;
  const supabase = await createInterviewAuthClient();

  const interviewResWithMethods = await supabase
    .from("interviews")
    .select("id, raw_text, status, created_at, structured_segments, interviewee_name, interviewee_context, competitors_used, alternatives_used")
    .eq("id", interviewId)
    .eq("project_id", projectId)
    .single();

  let interviewRes = interviewResWithMethods;
  if (interviewResWithMethods.error && isMissingMethodsColumnsError(interviewResWithMethods.error.message)) {
    // Backward-compatible fallback for environments where migration 015 is not applied yet.
    interviewRes = await supabase
      .from("interviews")
      .select("id, raw_text, status, created_at, structured_segments, interviewee_name, interviewee_context")
      .eq("id", interviewId)
      .eq("project_id", projectId)
      .single();
  }

  const interview = interviewRes.data as (typeof interviewResWithMethods.data & {
    competitors_used?: unknown;
    current_methods?: unknown;
    alternatives_used?: unknown;
  }) | null;

  if (interviewRes.error || !interview) {
    notFound();
  }

  const { data: siblings } = await supabase
    .from("interviews")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const interviewNumber = siblings ? siblings.findIndex((s) => s.id === interviewId) + 1 : null;

  const structured = interview.structured_segments as {
    summary?: string;
    segments?: Array<{ type: string; text: string; quote?: string; intensity?: number }>;
  } | null;
  const summary = structured?.summary ?? null;
  const segments = structured?.segments ?? [];
  const painCount = segments.filter((s) => s.type === "pain").length;

  const topQuotes = [...segments]
    .filter((s) => (s.quote && s.quote.trim().length > 0) || s.text.trim().length > 0)
    .sort((a, b) => {
      const typePriority = (t: string) => (t === "pain" ? 0 : 1);
      const byType = typePriority(a.type) - typePriority(b.type);
      if (byType !== 0) return byType;
      return (b.intensity ?? 0) - (a.intensity ?? 0);
    })
    .slice(0, 3)
    .map((s) => ({ ...s, displayQuote: s.quote?.trim() || s.text }));

  const { data: extractedProblems } = await supabase
    .from("extracted_problems")
    .select("problem_text, root_cause, customer_type, confidence, supporting_quote, intensity_score")
    .eq("interview_id", interviewId)
    .order("intensity_score", { ascending: false });

  const competitorsUsedRaw = Array.isArray(interview.competitors_used)
    ? interview.competitors_used
    : Array.isArray(interview.current_methods)
      ? interview.current_methods
      : [];
  const competitorsUsed = Array.isArray(competitorsUsedRaw)
    ? competitorsUsedRaw.filter((v): v is string => typeof v === "string").slice(0, 8)
    : [];
  const alternativesUsed = Array.isArray(interview.alternatives_used)
    ? interview.alternatives_used.filter((v): v is string => typeof v === "string").slice(0, 8)
    : [];

  return (
    <InterviewDetailClient
      interview={interview}
      projectId={projectId}
      summary={summary}
      topQuotes={topQuotes}
      painCount={painCount}
      interviewNumber={interviewNumber}
      structuredSegments={segments.length > 0 ? (segments as Array<{ type: "pain" | "context" | "emotion" | "intensity"; text: string; quote?: string; intensity?: number }>) : null}
      extractedProblems={extractedProblems ?? []}
      intervieweeName={interview.interviewee_name ?? null}
      intervieweeContext={interview.interviewee_context ?? null}
      alternativesUsed={alternativesUsed}
      currentMethods={competitorsUsed}
    />
  );
}

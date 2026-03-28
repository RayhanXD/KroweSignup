import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import InterviewDetailClient from "./InterviewDetailClient";

export const dynamic = "force-dynamic";

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; interviewId: string }>;
}) {
  const { projectId, interviewId } = await params;
  const supabase = createServerSupabaseClient();

  const { data: interview, error } = await supabase
    .from("interviews")
    .select("id, raw_text, status, created_at, structured_segments")
    .eq("id", interviewId)
    .eq("project_id", projectId)
    .single();

  if (error || !interview) {
    notFound();
  }

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

  return (
    <InterviewDetailClient
      interview={interview}
      projectId={projectId}
      summary={summary}
      topQuotes={topQuotes}
      painCount={painCount}
      structuredSegments={segments.length > 0 ? (segments as Array<{ type: "pain" | "context" | "emotion" | "intensity"; text: string; quote?: string; intensity?: number }>) : null}
    />
  );
}

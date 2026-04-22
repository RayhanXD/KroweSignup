import { createServerSupabaseClient } from "../supabaseServer";
import { structureInterview } from "./structureInterview";
import { extractProblems } from "./extractProblems";
import { prepareProblemsForInsertWithSemanticDedup } from "./semanticDedup";
import { embedProblems, clusterByCosineSimilarity } from "./clusterProblems";
import { scoreCluster, selectTopQuotes } from "./scoreProblems";
import { mergeCluster } from "./mergeClusters";
import { categorizeClusterGroups } from "./categorizeClusterGroups";
import type { ExtractedProblemWithEmbedding, ProblemCluster } from "./types";

// Per-project mutex: if a preview is already running, new callers coalesce onto it.
const inProgress = new Map<string, Promise<{ ok: boolean; clusterCount: number }>>();

export async function runLivePreview(
  projectId: string
): Promise<{ ok: boolean; clusterCount: number }> {
  const existing = inProgress.get(projectId);
  if (existing) return existing;

  const task = _run(projectId).finally(() => {
    if (inProgress.get(projectId) === task) inProgress.delete(projectId);
  });
  inProgress.set(projectId, task);
  return task;
}

async function _run(projectId: string): Promise<{ ok: boolean; clusterCount: number }> {
  console.time(`[livePreview] ${projectId}`);
  const supabase = createServerSupabaseClient();

  const { data: allInterviewsRaw } = await supabase
    .from("interviews")
    .select("id")
    .eq("project_id", projectId);
  const allInterviewIds = (allInterviewsRaw ?? []).map((i: { id: string }) => i.id);

  if (allInterviewIds.length === 0) {
    return { ok: true, clusterCount: 0 };
  }

  // Structure + extract for any pending/failed interviews
  const { data: pendingRaw } = await supabase
    .from("interviews")
    .select("id, raw_text, status")
    .eq("project_id", projectId)
    .in("status", ["pending", "failed"]);

  await Promise.allSettled(
    (pendingRaw ?? []).map(async (interview: { id: string; raw_text: string; status: string }) => {
      try {
        const structured = await structureInterview(interview.raw_text);
        await supabase
          .from("interviews")
          .update({ structured_segments: structured, status: "structured" })
          .eq("id", interview.id);

        const problems = await extractProblems(structured.segments, interview.raw_text);
        if (problems.length > 0) {
          const preparedRows = await prepareProblemsForInsertWithSemanticDedup({
            projectId,
            interviewId: interview.id,
            problems,
          });
          await supabase.from("extracted_problems").insert(preparedRows);
        }
      } catch (e) {
        console.error(`[livePreview] interview ${interview.id} failed:`, e);
      }
    })
  );

  // Load all extracted problems for this project
  const { data: allProblemsRaw } = await supabase
    .from("extracted_problems")
    .select(
      "id, interview_id, problem_text, customer_type, context, root_cause, intensity_score, confidence, supporting_quote, verbatim_quote, embedding"
    )
    .in("interview_id", allInterviewIds);

  const allProblems = allProblemsRaw ?? [];

  // Embed any problems missing embeddings
  const needsEmbedding = allProblems.filter((p: { embedding: unknown }) => !p.embedding);
  if (needsEmbedding.length > 0) {
    const embeddings = await embedProblems(
      needsEmbedding.map((p: { id: string; problem_text: string; root_cause?: string | null }) => ({
        id: p.id,
        text: p.root_cause ?? p.problem_text,
      }))
    );
    await Promise.all(
      embeddings.map(({ id, embedding }) =>
        supabase.from("extracted_problems").update({ embedding }).eq("id", id)
      )
    );
  }

  // Reload with embeddings present
  const { data: problemsWithEmbeddings } = await supabase
    .from("extracted_problems")
    .select(
      "id, interview_id, problem_text, customer_type, context, root_cause, intensity_score, confidence, supporting_quote, verbatim_quote, embedding"
    )
    .in("interview_id", allInterviewIds)
    .not("embedding", "is", null);

  const problemsForClustering: ExtractedProblemWithEmbedding[] = (
    problemsWithEmbeddings ?? []
  ).map(
    (p: {
      id: string;
      interview_id: string;
      problem_text: string;
      customer_type: string;
      context: string;
      root_cause: string | null;
      intensity_score: number;
      confidence: number;
      supporting_quote: string;
      verbatim_quote: string | null;
      embedding: number[];
    }) => ({
      id: p.id,
      interview_id: p.interview_id,
      problem_text: p.problem_text,
      customer_type: p.customer_type,
      context: p.context,
      root_cause: p.root_cause ?? "",
      intensity_score: p.intensity_score,
      confidence: p.confidence,
      supporting_quote: p.supporting_quote,
      verbatim_quote: p.verbatim_quote ?? undefined,
      embedding: Array.isArray(p.embedding)
        ? p.embedding
        : (p.embedding as unknown as number[]),
    })
  );

  if (problemsForClustering.length === 0) {
    console.timeEnd(`[livePreview] ${projectId}`);
    return { ok: true, clusterCount: 0 };
  }

  const totalProblems = problemsForClustering.length;
  const totalInterviews = allInterviewIds.length;
  const rawClusters = clusterByCosineSimilarity(problemsForClustering, 0.82);

  const scoredClusters = await Promise.all(
    rawClusters.map(async (members) => {
      const canonicalStatement = await mergeCluster(members);
      const scores = scoreCluster(members, totalInterviews, totalProblems);
      const supportingQuotes = selectTopQuotes(
        members.map((m) => ({
          text: m.supporting_quote,
          normalized_text: m.supporting_quote,
          verbatim_text: m.verbatim_quote,
          interview_id: m.interview_id,
          problem_id: m.id,
          intensity: m.intensity_score,
        }))
      );
      return {
        canonical_problem: canonicalStatement,
        frequency: scores.frequency,
        avg_intensity: scores.avg_intensity,
        consistency_score: scores.consistency_score,
        score: scores.score,
        supporting_quotes: supportingQuotes,
        member_problem_ids: members.map((m) => m.id),
        category: "General Problems",
      } as ProblemCluster;
    })
  );

  const finalClusters = scoredClusters.sort((a, b) => b.score - a.score).slice(0, 6);
  const categorizedClusters = await categorizeClusterGroups(finalClusters);

  await supabase.from("problem_clusters").delete().eq("project_id", projectId);
  const { error: insertErr } = await supabase.from("problem_clusters").insert(
    categorizedClusters.map((c) => ({
      project_id: projectId,
      canonical_problem: c.canonical_problem,
      frequency: c.frequency,
      avg_intensity: c.avg_intensity,
      consistency_score: c.consistency_score,
      score: c.score,
      supporting_quotes: c.supporting_quotes,
      member_problem_ids: c.member_problem_ids,
      category: c.category,
    }))
  );
  if (insertErr) {
    console.error("[livePreview] cluster insert failed:", insertErr.message);
  }

  console.timeEnd(`[livePreview] ${projectId}`);
  console.log(`[livePreview] ${projectId} done — ${categorizedClusters.length} clusters`);

  return { ok: true, clusterCount: categorizedClusters.length };
}

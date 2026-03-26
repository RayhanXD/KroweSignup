import { createServerSupabaseClient } from "../supabaseServer";
import { structureInterview } from "./structureInterview";
import { extractProblems } from "./extractProblems";
import { embedProblems, clusterByCosineSimilarity } from "./clusterProblems";
import { scoreCluster, selectTopQuotes } from "./scoreProblems";
import { mergeCluster } from "./mergeClusters";
import { mergeClusterGroups } from "./mergeClusterGroups";
import { generateDecision } from "./generateDecision";
import { categorizeClusterGroups } from "./categorizeClusterGroups";
import { generateMetaClusters } from "./generateMetaClusters";
import type {
  ExtractedProblemWithEmbedding,
  ProblemCluster,
  PipelineResult,
} from "./types";

export async function runDecisionPipeline(projectId: string, force = false): Promise<PipelineResult> {
  const supabase = createServerSupabaseClient();

  try {
    // 1. Load project to check interview count
    const { data: project } = await supabase
      .from("interview_projects")
      .select("id, interview_count, session_id")
      .eq("id", projectId)
      .single();

    if (!project) throw new Error("Project not found");

    if (project.interview_count < 3) {
      const [insufficientDecisionResult] = await Promise.all([
        supabase
          .from("decision_outputs")
          .upsert(
            {
              project_id: projectId,
              status: "insufficient_data",
              updated_at: new Date().toISOString(),
              selected_cluster_id: null,
              reasoning: "Insufficient interviews to generate a decision. At least 3 interviews are required.",
              feature_specs: [],
              user_flows: [],
              edge_cases: [],
              success_metrics: [],
              confidence_score: 0,
            },
            { onConflict: "project_id" }
          ),
        supabase
          .from("interview_projects")
          .update({ status: "ready", updated_at: new Date().toISOString() })
          .eq("id", projectId),
      ]);
      if (insufficientDecisionResult.error) {
        const err = insufficientDecisionResult.error;
        console.error("[pipeline] decision_outputs upsert failed:", err.message, err.details, err.hint);
        throw new Error(`Failed to save insufficient_data decision: ${err.message}`);
      }
      return { ok: false, status: "insufficient_data" };
    }

    // Fetch all interview IDs once and reuse (avoids 2 redundant subqueries later)
    const { data: allInterviewsRaw } = await supabase
      .from("interviews")
      .select("id")
      .eq("project_id", projectId);
    const allInterviewIds = (allInterviewsRaw ?? []).map((i: { id: string }) => i.id);

    // On force rerun: delete extracted problems and reset all interviews to pending
    // so structuring + extraction runs fresh (catches cases where extraction previously returned [])
    if (force && allInterviewIds.length > 0) {
      await Promise.all([
        supabase.from("extracted_problems").delete().in("interview_id", allInterviewIds),
        supabase.from("interviews").update({ status: "pending" }).in("id", allInterviewIds),
      ]);
    }

    // 2. Load pending/failed interviews
    const { data: pendingInterviews } = await supabase
      .from("interviews")
      .select("id, raw_text, status")
      .eq("project_id", projectId)
      .in("status", ["pending", "failed"]);

    const interviewsToProcess = pendingInterviews ?? [];

    // 3. Process each interview in parallel
    console.time("[pipeline] interviews");
    await Promise.allSettled(
      interviewsToProcess.map(async (interview) => {
        try {
          const structured = await structureInterview(interview.raw_text);
          await supabase
            .from("interviews")
            .update({
              structured_segments: structured.segments,
              status: "structured",
            })
            .eq("id", interview.id);

          const problems = await extractProblems(structured.segments, interview.raw_text);
          console.log(`[pipeline] interview ${interview.id} extracted ${problems.length} problems`);
          if (problems.length > 0) {
            const { error: insertErr } = await supabase.from("extracted_problems").insert(
              problems.map((p) => ({
                interview_id: interview.id,
                problem_text: p.problem_text,
                customer_type: p.customer_type,
                context: p.context,
                root_cause: p.root_cause ?? null,
                intensity_score: p.intensity_score,
                confidence: p.confidence,
                supporting_quote: p.supporting_quote ?? null,
                embedding: null,
              }))
            );
            if (insertErr) {
              console.error(`[pipeline] interview ${interview.id} extracted_problems insert failed:`, insertErr.message);
            }
          }
        } catch (e) {
          await supabase
            .from("interviews")
            .update({ status: "failed" })
            .eq("id", interview.id);
          console.error(`[pipeline] Interview ${interview.id} failed:`, e);
        }
      })
    );
    console.timeEnd("[pipeline] interviews");
    console.log(`[pipeline] interviews processed: ${interviewsToProcess.length} attempted`);

    // 4. Load all extracted problems for project (reuse allInterviewIds)
    const { data: allProblemsRaw } = await supabase
      .from("extracted_problems")
      .select("id, interview_id, problem_text, customer_type, context, root_cause, intensity_score, confidence, supporting_quote, embedding")
      .in("interview_id", allInterviewIds);

    const allProblems = allProblemsRaw ?? [];
    console.log(`[pipeline] extracted problems loaded: ${allProblems.length}`);

    // 5. Embed problems that have no embedding
    console.time("[pipeline] embed");
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
          supabase
            .from("extracted_problems")
            .update({ embedding: embedding })
            .eq("id", id)
        )
      );
    }
    console.timeEnd("[pipeline] embed");

    // 6. Reload all problems with embeddings (reuse allInterviewIds)
    const { data: problemsWithEmbeddings } = await supabase
      .from("extracted_problems")
      .select("id, interview_id, problem_text, customer_type, context, root_cause, intensity_score, confidence, supporting_quote, embedding")
      .in("interview_id", allInterviewIds)
      .not("embedding", "is", null);

    const problemsForClustering: ExtractedProblemWithEmbedding[] = (problemsWithEmbeddings ?? []).map(
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
        embedding: Array.isArray(p.embedding) ? p.embedding : (p.embedding as unknown as number[]),
      })
    );

    console.log(`[pipeline] problems with embeddings: ${problemsForClustering.length}`);

    if (problemsForClustering.length === 0) {
      const [noEmbeddingsDecisionResult] = await Promise.all([
        supabase
          .from("decision_outputs")
          .upsert(
            {
              project_id: projectId,
              status: "insufficient_data",
              updated_at: new Date().toISOString(),
              selected_cluster_id: null,
              reasoning: "No problems could be extracted and embedded from the interviews. Ensure transcripts contain substantive content.",
              feature_specs: [],
              user_flows: [],
              edge_cases: [],
              success_metrics: [],
              confidence_score: 0,
            },
            { onConflict: "project_id" }
          ),
        supabase
          .from("interview_projects")
          .update({ status: "ready", updated_at: new Date().toISOString() })
          .eq("id", projectId),
      ]);
      if (noEmbeddingsDecisionResult.error) {
        const err = noEmbeddingsDecisionResult.error;
        console.error("[pipeline] decision_outputs upsert failed:", err.message, err.details, err.hint);
        throw new Error(`Failed to save insufficient_data decision: ${err.message}`);
      }
      return { ok: false, status: "insufficient_data" };
    }

    // 7. Cluster
    const clusters = clusterByCosineSimilarity(problemsForClustering, 0.82);

    console.log(`[pipeline] clusters formed: ${clusters.length}`);

    // 8. Merge + score each cluster
    const totalProblems = problemsForClustering.length;
    const totalInterviews = allInterviewIds.length;

    console.time("[pipeline] merge");
    const scoredClusters = await Promise.all(
      clusters.map(async (members) => {
        const canonicalStatement = await mergeCluster(members);
        console.log(
          `[pipeline] cluster merge: [${members.map((m) => m.problem_text).join(" | ")}] → "${canonicalStatement}"`
        );

        const scores = scoreCluster(members, totalInterviews, totalProblems);
        const supportingQuotes = selectTopQuotes(
          members.map((m) => ({
            text: m.supporting_quote,
            interview_id: m.interview_id,
            problem_id: m.id,
            intensity: m.intensity_score,
          }))
        );

        const cluster: ProblemCluster = {
          canonical_problem: canonicalStatement,
          frequency: scores.frequency,
          avg_intensity: scores.avg_intensity,
          consistency_score: scores.consistency_score,
          score: scores.score,
          supporting_quotes: supportingQuotes,
          member_problem_ids: members.map((m) => m.id),
          category: "General Problems",
        };
        return cluster;
      })
    );
    console.timeEnd("[pipeline] merge");

    // 8b. Global merge: reduce to max 6 decisive clusters
    console.time("[pipeline] global-merge");
    const clustersWithMembers = scoredClusters.map((cluster, i) => ({
      ...cluster,
      _members: clusters[i],
    }));
    const mergedClusters = await mergeClusterGroups(
      clustersWithMembers,
      totalInterviews,
      totalProblems,
      6
    );
    const finalClusters = mergedClusters.sort((a, b) => b.score - a.score).slice(0, 6);
    console.log(`[pipeline] clusters after global merge: ${finalClusters.length}`);
    console.timeEnd("[pipeline] global-merge");

    // 8c. Generate meta clusters
    console.time("[pipeline] meta-clusters");
    const metaClusters = await generateMetaClusters(finalClusters);
    console.log(`[pipeline] meta clusters generated: ${metaClusters.length}`);
    console.timeEnd("[pipeline] meta-clusters");

    // 8d. Categorize clusters
    console.time("[pipeline] categorize");
    const categorizedClusters = await categorizeClusterGroups(finalClusters);
    console.timeEnd("[pipeline] categorize");

    // 9. Delete old clusters, insert new ones — run in parallel with founder context query
    let insertedClusters: Array<{ id: string; canonical_problem: string }> = [];

    const [, founderAnswerResult] = await Promise.all([
      (async () => {
        await supabase.from("problem_clusters").delete().eq("project_id", projectId);
        const { data } = await supabase
          .from("problem_clusters")
          .insert(
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
          )
          .select("id, canonical_problem");
        insertedClusters = (data ?? []) as Array<{ id: string; canonical_problem: string }>;
      })(),
      project.session_id
        ? supabase
            .from("signup_answers")
            .select("step_key, final_answer")
            .eq("session_id", project.session_id)
            .in("step_key", ["idea", "problem", "target_customer", "industry"])
        : Promise.resolve({ data: null }),
    ]);

    // Merge inserted IDs into categorized clusters using canonical_problem as key
    // (index-zip is unreliable — Supabase does not guarantee insertion-return order)
    const canonicalToId = new Map<string, string>(
      insertedClusters.map((r) => [r.canonical_problem, r.id])
    );
    const allClustersWithIds = categorizedClusters.map((c) => ({
      ...c,
      id: canonicalToId.get(c.canonical_problem) ?? "",
    })) as Array<ProblemCluster & { id: string }>;

    // Remap meta cluster cluster_ids from "cluster_N" index strings to real DB IDs.
    // Match via canonical_problem to avoid relying on Supabase insertion-return order.
    const metaClustersWithRealIds = metaClusters.map((mc) => ({
      ...mc,
      cluster_ids: mc.cluster_ids
        .map((cid) => {
          const idx = parseInt(cid.replace("cluster_", ""), 10);
          if (isNaN(idx)) return null;
          const sourceCanonical = finalClusters[idx]?.canonical_problem;
          if (!sourceCanonical) return null;
          return allClustersWithIds.find((c) => c.canonical_problem === sourceCanonical)?.id ?? null;
        })
        .filter((id): id is string => id !== null),
    }));

    // 10. Sort clusters by score, apply sanity check to find top cluster
    const sorted = [...allClustersWithIds].sort((a, b) => b.score - a.score);

    const topCluster =
      sorted.find((c) => {
        const uniqueInterviewCount = new Set(
          c.supporting_quotes.map((q) => q.interview_id)
        ).size;
        return uniqueInterviewCount >= 2 || c.avg_intensity >= 4.5;
      }) ?? sorted[0];

    const topClusterId = topCluster.id;
    console.log(
      `[pipeline] top cluster selected: "${topCluster.canonical_problem}" (score=${topCluster.score.toFixed(2)}, freq=${topCluster.frequency})`
    );

    // 11. Resolve founder context from parallel query result
    let founderContext: {
      idea: string | null;
      problem: string | null;
      targetCustomer: string | null;
      industry: string | null;
    } | null = null;

    const founderAnswers = (founderAnswerResult as { data: Array<{ step_key: string; final_answer: unknown }> | null }).data;
    if (founderAnswers && founderAnswers.length > 0) {
      const byKey = Object.fromEntries(
        founderAnswers.map((a) => [a.step_key, a.final_answer])
      );
      founderContext = {
        idea: (byKey["idea"] as string) ?? null,
        problem: (byKey["problem"] as string) ?? null,
        targetCustomer: (byKey["target_customer"] as string) ?? null,
        industry: (byKey["industry"] as string) ?? null,
      };
    }

    // 12. Generate decision
    console.time("[pipeline] decision");
    const decision = await generateDecision({
      cluster: topCluster,
      allClusters: allClustersWithIds,
      founderContext,
    });
    console.timeEnd("[pipeline] decision");
    console.log(`[pipeline] decision generated: confidence=${decision.confidence_score}`);

    // 13. Upsert decision output
    const { data: decisionRow, error: decisionErr } = await supabase
      .from("decision_outputs")
      .upsert(
        {
          project_id: projectId,
          selected_cluster_id: topClusterId,
          reasoning: decision.reasoning,
          feature_specs: decision.feature_specs,
          user_flows: decision.user_flows,
          edge_cases: decision.edge_cases,
          success_metrics: decision.success_metrics,
          confidence_score: decision.confidence_score,
          meta_clusters: metaClustersWithRealIds,
          status: "ready",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id" }
      )
      .select("id")
      .single();

    if (decisionErr) throw new Error(`Failed to save decision output: ${decisionErr.message}`);
    console.log(`[pipeline] decision output saved: id=${decisionRow?.id}`);

    // 14. Update project status
    await supabase
      .from("interview_projects")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", projectId);

    return { ok: true, decisionOutputId: decisionRow!.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[pipeline] Pipeline failed for project ${projectId}:`, e);
    await supabase
      .from("interview_projects")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", projectId);
    return { ok: false, error, status: "failed" };
  }
}

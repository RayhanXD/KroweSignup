import OpenAI from "openai";
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
import { extractMethodsAlternatives } from "./extractMethodsAlternatives";
import { classifyCompetitors } from "./classifyCompetitors";
import { runAssumptionMatching } from "@/lib/analysis/assumptionMatching";
import type { AssumptionVsEvidenceReport } from "@/lib/analysis/assumptionMatching";
import { analyzeHypothesisVsReality } from "@/lib/analysis/hypothesisVsReality";
import type { AnalysisInput } from "@/lib/analysis/hypothesisVsReality";
import { ENV } from "../env";
import { extractResponseText } from "@/lib/openai/extractResponseText";
import type {
  ExtractedProblemWithEmbedding,
  ProblemCluster,
  PipelineResult,
} from "./types";
import {
  buildEarlyFounderFromRows,
  buildFounderContextAndOnboardingFromRows,
  fetchSignupAnswersForSession,
  STEP_KEYS_PIPELINE_EARLY,
  STEP_KEYS_PIPELINE_FULL,
} from "./founderContextFromSignup";

const openaiClient = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

function parseFeatures(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}

async function computeAlignmentScore(clusterText: string, founderProblem: string): Promise<number> {
  if (!clusterText || !founderProblem) return 0;
  try {
    const resp = await openaiClient.responses.create({
      model: "gpt-5.4-mini",
      input: [{
        role: "user",
        content: `Score semantic alignment between these two statements from 0 to 1.\n\nFOUNDER PROBLEM:\n${founderProblem}\n\nUSER PROBLEM CLUSTER:\n${clusterText}\n\nReturn ONLY a JSON object with a single field "score" (number 0–1).`
      }],
      text: {
        format: {
          type: "json_schema",
          name: "alignment_score",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { score: { type: "number" } },
            required: ["score"],
          },
        },
      },
    });
    const raw = extractResponseText(resp);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { score: number };
    return Math.max(0, Math.min(1, parsed.score));
  } catch {
    return 0;
  }
}

function computeConfidence(interviewCount: number, topScore: number, secondScore: number | null): number {
  const volumeScore = Math.min(interviewCount / 10, 1);
  const dominance = secondScore !== null
    ? (topScore - secondScore) / (topScore || 1)
    : 1;
  return Math.max(0, Math.min(1, 0.5 * volumeScore + 0.5 * dominance));
}

function confidenceLabel(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score < 0.3) return "LOW";
  if (score < 0.7) return "MEDIUM";
  return "HIGH";
}

async function validateFeatures(features: string[], problems: string[]): Promise<{
  mustBuild: string[];
  irrelevant: string[];
  missing: string[];
}> {
  const empty = { mustBuild: [], irrelevant: [], missing: [] };
  if (!features.length || !problems.length) return empty;

  const prompt = `
You are analyzing startup features against real user problems.

FEATURES:
${features.map((f, i) => `${i + 1}. ${f}`).join("\n")}

USER PROBLEMS:
${problems.map((p, i) => `${i + 1}. ${p}`).join("\n")}

TASK:
1. MUST-BUILD: features clearly supported by user problems
2. IRRELEVANT: features not supported by evidence (founder bias)
3. MISSING: strong problems with no corresponding feature

Return JSON: { "mustBuild": string[], "irrelevant": string[], "missing": string[] }
Be strict. Only include if clearly justified.
`.trim();

  const maxAttempts = 3;
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await openaiClient.responses.create({
        model: "gpt-5.4-mini",
        input: [{ role: "user", content: prompt }],
        text: {
          format: {
            type: "json_schema",
            name: "feature_validation",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                mustBuild: { type: "array", items: { type: "string" } },
                irrelevant: { type: "array", items: { type: "string" } },
                missing: { type: "array", items: { type: "string" } },
              },
              required: ["mustBuild", "irrelevant", "missing"],
            },
          },
        },
      });
      const raw = extractResponseText(resp);
      if (!raw) throw new Error("empty model output");
      return JSON.parse(raw) as typeof empty;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 500 * attempt));
        continue;
      }
    }
  }
  console.error("[pipeline] validateFeatures failed:", lastError);
  return empty;
}

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

    // Fetch founder context early to improve competitor extraction accuracy
    let earlyFounderIdea: string | null = null;
    let earlyFounderProblem: string | null = null;
    if (project.session_id) {
      const earlyRows = await fetchSignupAnswersForSession(
        supabase,
        project.session_id,
        STEP_KEYS_PIPELINE_EARLY
      );
      const early = buildEarlyFounderFromRows(earlyRows);
      earlyFounderIdea = early.idea;
      earlyFounderProblem = early.problem;
    }

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
          const methodsAndAlternatives = await extractMethodsAlternatives(
            interview.raw_text,
            earlyFounderIdea || earlyFounderProblem
              ? { idea: earlyFounderIdea ?? undefined, problem: earlyFounderProblem ?? undefined }
              : undefined
          );
          await supabase
            .from("interviews")
            .update({
              structured_segments: structured,
              competitors_used: methodsAndAlternatives.competitors_used,
              alternatives_used: methodsAndAlternatives.alternatives_used,
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
                verbatim_quote: p.verbatim_quote ?? null,
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
      .select("id, interview_id, problem_text, customer_type, context, root_cause, intensity_score, confidence, supporting_quote, verbatim_quote, embedding")
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
      .select("id, interview_id, problem_text, customer_type, context, root_cause, intensity_score, confidence, supporting_quote, verbatim_quote, embedding")
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
            normalized_text: m.supporting_quote,
            verbatim_text: m.verbatim_quote,
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

    const [, founderRows, interviewMethodsResult] = await Promise.all([
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
        ? fetchSignupAnswersForSession(
            supabase,
            project.session_id,
            STEP_KEYS_PIPELINE_FULL
          )
        : Promise.resolve([]),
      supabase
        .from("interviews")
        .select("competitors_used, alternatives_used")
        .eq("project_id", projectId),
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

    console.log(
      `[pipeline] top cluster selected (pre-alignment): "${topCluster.canonical_problem}" (score=${topCluster.score.toFixed(2)}, freq=${topCluster.frequency})`
    );

    // 11. Resolve founder context from parallel query result
    const projectCompetitorsUsed = new Map<string, number>();
    const projectAlternativesUsed = new Map<string, number>();

    const interviewMethodsRows = (interviewMethodsResult as {
      data: Array<{ competitors_used: unknown; alternatives_used: unknown }> | null;
    }).data ?? [];
    for (const row of interviewMethodsRows) {
      const competitorsUsed = Array.isArray(row.competitors_used) ? row.competitors_used : [];
      const alternativesUsed = Array.isArray(row.alternatives_used) ? row.alternatives_used : [];
      for (const competitor of competitorsUsed) {
        if (typeof competitor !== "string" || !competitor.trim()) continue;
        const key = competitor.trim();
        projectCompetitorsUsed.set(key, (projectCompetitorsUsed.get(key) ?? 0) + 1);
      }
      for (const alternative of alternativesUsed) {
        if (typeof alternative !== "string" || !alternative.trim()) continue;
        const key = alternative.trim();
        projectAlternativesUsed.set(key, (projectAlternativesUsed.get(key) ?? 0) + 1);
      }
    }
    const topCompetitorsUsed = [...projectCompetitorsUsed.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([text]) => text);
    const topAlternativesUsed = [...projectAlternativesUsed.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([text]) => text);

    const { founderContext, onboarding } =
      buildFounderContextAndOnboardingFromRows(founderRows);

    // 11b. Run assumption matching (non-blocking)
    let assumptionAnalysis: AssumptionVsEvidenceReport | null = null;
    if (onboarding) {
      try {
        assumptionAnalysis = await runAssumptionMatching(onboarding, allClustersWithIds);
      } catch (err) {
        console.error("[pipeline] assumptionMatching failed, continuing:", err);
      }
    }

    // 11c. Run feature validation (non-blocking)
    let featureValidation: { mustBuild: string[]; irrelevant: string[]; missing: string[] } | null = null;
    if (onboarding) {
      try {
        const features = parseFeatures(onboarding.features);
        const problems = allClustersWithIds.map(c => c.canonical_problem).filter(Boolean);
        featureValidation = await validateFeatures(features, problems);
        console.log(`[pipeline] featureValidation: mustBuild=${featureValidation.mustBuild.length}, irrelevant=${featureValidation.irrelevant.length}, missing=${featureValidation.missing.length}`);
      } catch (err) {
        console.error("[pipeline] featureValidation failed, continuing:", err);
      }
    }

    // 11d. Alignment re-ranking: blend existing score (70%) with founder alignment (30%)
    let alignedTopCluster = topCluster; // fallback to existing selection
    let pipelineConfidenceScore = 0;
    let pipelineConfidenceLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    if (founderContext?.problem) {
      const alignmentScores = await Promise.all(
        allClustersWithIds.map(c => computeAlignmentScore(c.canonical_problem, founderContext!.problem!))
      );
      const alignedClusters = allClustersWithIds.map((c, i) => ({
        ...c,
        finalScore: 0.7 * c.score + 0.3 * alignmentScores[i],
      }));
      alignedClusters.sort((a, b) => b.finalScore - a.finalScore);
      console.log(`[pipeline] alignment re-ranking complete`);

      alignedTopCluster =
        alignedClusters.find((c) => {
          const uniqueCount = new Set(c.supporting_quotes.map(q => q.interview_id)).size;
          return uniqueCount >= 2 || c.avg_intensity >= 4.5;
        }) ?? alignedClusters[0];

      const secondScore = alignedClusters[1]?.finalScore ?? null;
      pipelineConfidenceScore = computeConfidence(
        allInterviewIds.length,
        alignedClusters[0].finalScore,
        secondScore
      );
      pipelineConfidenceLevel = confidenceLabel(pipelineConfidenceScore);
      console.log(`[pipeline] confidence: ${pipelineConfidenceLevel} (${pipelineConfidenceScore.toFixed(2)})`);
    } else {
      // No founder problem to align against — use interview count + existing dominance
      const sorted2 = [...allClustersWithIds].sort((a, b) => b.score - a.score);
      pipelineConfidenceScore = computeConfidence(
        allInterviewIds.length,
        sorted2[0]?.score ?? 0,
        sorted2[1]?.score ?? null
      );
      pipelineConfidenceLevel = confidenceLabel(pipelineConfidenceScore);
    }

    const topClusterId = alignedTopCluster.id;

    // 11e. Classify competitors vs online workarounds
    let directCompetitors = topCompetitorsUsed;
    let onlineWorkarounds: string[] = [];
    if (topCompetitorsUsed.length > 0 && onboarding?.idea && onboarding?.problem) {
      try {
        const classification = await classifyCompetitors(
          topCompetitorsUsed, onboarding.idea, onboarding.problem
        );
        directCompetitors = classification.directCompetitors;
        onlineWorkarounds = classification.onlineWorkarounds;
        console.log(`[pipeline] classifyCompetitors: direct=${directCompetitors.length}, workarounds=${onlineWorkarounds.length}`);
      } catch (err) {
        console.error("[pipeline] classifyCompetitors failed, falling back:", err);
      }
    }

    // 12. Generate decision
    console.time("[pipeline] decision");
    const decision = await generateDecision({
      cluster: alignedTopCluster,
      allClusters: allClustersWithIds,
      founderContext,
      onboarding,
      assumptionAnalysis,
      featureValidation,
      directCompetitors,
      onlineWorkarounds,
      alternativesUsed: topAlternativesUsed,
      confidenceScore: pipelineConfidenceScore,
      confidenceLevel: pipelineConfidenceLevel,
    });
    console.timeEnd("[pipeline] decision");
    console.log(`[pipeline] decision generated: confidence=${decision.confidence_score}`);

    // 13. Upsert decision output
    const decisionUpdatedAt = new Date().toISOString();
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
          updated_at: decisionUpdatedAt,
        },
        { onConflict: "project_id" }
      )
      .select("id")
      .single();

    if (decisionErr) throw new Error(`Failed to save decision output: ${decisionErr.message}`);
    console.log(`[pipeline] decision output saved: id=${decisionRow?.id}`);

    // 14b. Run hypothesis vs reality analysis and persist to decision_outputs (non-blocking)
    if (onboarding) {
      try {
        const analysisInput: AnalysisInput = {
          onboarding: {
            idea: onboarding.idea ?? "",
            problem: onboarding.problem ?? "",
            target_customer: onboarding.target_customer ?? "",
            features: parseFeatures(onboarding.features),
          },
          interviewData: {
            topProblem: alignedTopCluster.canonical_problem,
            problemClusters: allClustersWithIds.map(c => c.canonical_problem),
            supportingQuotes: (alignedTopCluster.supporting_quotes ?? [])
              .slice(0, 5)
              .map((q: { text: string }) => q.text),
            featureSpecs: decision.feature_specs?.map((f: { name: string }) => f.name) ?? [],
            reasoning: Array.isArray(decision.reasoning) ? decision.reasoning : [],
            directCompetitors,
            onlineWorkarounds,
            alternativesUsed: topAlternativesUsed,
          },
        };

        const analysisResult = await analyzeHypothesisVsReality(analysisInput);
        const nowIso = new Date().toISOString();

        await supabase
          .from("decision_outputs")
          .update({
            analysis_result: analysisResult,
            analysis_basis_updated_at: decisionUpdatedAt,
            analysis_generated_at: nowIso,
          })
          .eq("project_id", projectId);

        console.log(`[pipeline] hypothesis vs reality analysis stored for project ${projectId}`);
      } catch (err) {
        console.error("[pipeline] hypothesisVsReality failed, continuing:", err);
      }
    }

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

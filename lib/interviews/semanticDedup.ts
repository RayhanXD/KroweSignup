import { isMongoConfigured } from "@/lib/env";
import {
  findNearDuplicate,
  insertCanonicalProblem,
  mergeIntoCanonicalProblem,
} from "@/lib/mongo/problemsRepo";
import { embedProblems } from "@/lib/interviews/clusterProblems";
import type { ExtractedProblem } from "@/lib/interviews/types";

const DEDUP_THRESHOLD = 0.95;

type DedupInput = {
  projectId: string;
  interviewId: string;
  problems: ExtractedProblem[];
};

export type PreparedProblemInsertRow = {
  interview_id: string;
  problem_text: string;
  customer_type: string;
  context: string;
  root_cause: string | null;
  intensity_score: number;
  confidence: number;
  supporting_quote: string | null;
  verbatim_quote: string | null;
  embedding: number[] | null;
};

function toCanonicalRow(
  interviewId: string,
  source: ExtractedProblem,
  embedding: number[],
  canonical?: { problemText: string; rootCause: string }
): PreparedProblemInsertRow {
  return {
    interview_id: interviewId,
    problem_text: canonical?.problemText ?? source.problem_text,
    customer_type: source.customer_type,
    context: source.context,
    root_cause: canonical?.rootCause ?? source.root_cause ?? null,
    intensity_score: source.intensity_score,
    confidence: source.confidence,
    supporting_quote: source.supporting_quote ?? null,
    verbatim_quote: source.verbatim_quote ?? null,
    embedding,
  };
}

export async function prepareProblemsForInsertWithSemanticDedup(
  input: DedupInput
): Promise<PreparedProblemInsertRow[]> {
  if (input.problems.length === 0) return [];

  const embedded = await embedProblems(
    input.problems.map((p, i) => ({
      id: String(i),
      text: p.root_cause ?? p.problem_text,
    }))
  );

  const embeddingByIndex = new Map<number, number[]>(
    embedded.map((item) => [Number(item.id), item.embedding])
  );

  if (!isMongoConfigured()) {
    return input.problems.map((problem, i) => {
      const embedding = embeddingByIndex.get(i);
      if (!embedding) {
        return {
          interview_id: input.interviewId,
          problem_text: problem.problem_text,
          customer_type: problem.customer_type,
          context: problem.context,
          root_cause: problem.root_cause ?? null,
          intensity_score: problem.intensity_score,
          confidence: problem.confidence,
          supporting_quote: problem.supporting_quote ?? null,
          verbatim_quote: problem.verbatim_quote ?? null,
          embedding: null,
        };
      }
      return toCanonicalRow(input.interviewId, problem, embedding, undefined);
    });
  }

  try {
    const rows: PreparedProblemInsertRow[] = [];

    for (let i = 0; i < input.problems.length; i++) {
      const problem = input.problems[i];
      const embedding = embeddingByIndex.get(i);
      if (!embedding) {
        rows.push({
          interview_id: input.interviewId,
          problem_text: problem.problem_text,
          customer_type: problem.customer_type,
          context: problem.context,
          root_cause: problem.root_cause ?? null,
          intensity_score: problem.intensity_score,
          confidence: problem.confidence,
          supporting_quote: problem.supporting_quote ?? null,
          verbatim_quote: problem.verbatim_quote ?? null,
          embedding: null,
        });
        continue;
      }

      const duplicate = await findNearDuplicate({
        projectId: input.projectId,
        embedding,
        threshold: DEDUP_THRESHOLD,
      });

      if (duplicate && duplicate.doc._id) {
        await mergeIntoCanonicalProblem({
          id: duplicate.doc._id.toString(),
          intensityScore: problem.intensity_score,
          supportingQuote: problem.supporting_quote,
          verbatimQuote: problem.verbatim_quote,
        });

        rows.push(
          toCanonicalRow(input.interviewId, problem, embedding, {
            problemText: duplicate.doc.canonical_problem_text,
            rootCause: duplicate.doc.canonical_root_cause,
          })
        );
      } else {
        await insertCanonicalProblem({
          projectId: input.projectId,
          interviewId: input.interviewId,
          canonicalProblemText: problem.problem_text,
          canonicalRootCause: problem.root_cause ?? problem.problem_text,
          embedding,
          intensityScore: problem.intensity_score,
          supportingQuote: problem.supporting_quote,
          verbatimQuote: problem.verbatim_quote,
        });

        rows.push(toCanonicalRow(input.interviewId, problem, embedding));
      }
    }

    return rows;
  } catch (error) {
    console.error("[semanticDedup] Mongo dedup failed, falling back to Supabase-only insert:", error);

    return input.problems.map((problem, i) => ({
      interview_id: input.interviewId,
      problem_text: problem.problem_text,
      customer_type: problem.customer_type,
      context: problem.context,
      root_cause: problem.root_cause ?? null,
      intensity_score: problem.intensity_score,
      confidence: problem.confidence,
      supporting_quote: problem.supporting_quote ?? null,
      verbatim_quote: problem.verbatim_quote ?? null,
      embedding: embeddingByIndex.get(i) ?? null,
    }));
  }
}

import { ObjectId, type Collection } from "mongodb";
import { ENV } from "@/lib/env";
import { getMongoDb } from "@/lib/mongo/client";

export type MongoProblemDocument = {
  _id?: ObjectId;
  projectId: string;
  canonical_problem_text: string;
  canonical_root_cause: string;
  embedding: number[];
  occurrence_count: number;
  max_intensity_score: number;
  supporting_quotes: string[];
  verbatim_quotes: string[];
  first_seen_interview_id: string;
  created_at: Date;
  updated_at: Date;
};

export type FindNearDuplicateInput = {
  projectId: string;
  embedding: number[];
  threshold: number;
};

export type FindNearDuplicateResult = {
  doc: MongoProblemDocument;
  similarity: number;
};

export type InsertCanonicalProblemInput = {
  projectId: string;
  interviewId: string;
  canonicalProblemText: string;
  canonicalRootCause: string;
  embedding: number[];
  intensityScore: number;
  supportingQuote?: string | null;
  verbatimQuote?: string | null;
};

export type MergeCanonicalProblemInput = {
  id: string;
  intensityScore: number;
  supportingQuote?: string | null;
  verbatimQuote?: string | null;
};

function normalizeUnique(values: Array<string | null | undefined>): string[] {
  const cleaned = values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return [...new Set(cleaned)];
}

async function getProblemsCollection(): Promise<Collection<MongoProblemDocument>> {
  const db = await getMongoDb();
  return db.collection<MongoProblemDocument>(ENV.MONGODB_PROBLEMS_COLLECTION);
}

export async function findNearDuplicate(
  input: FindNearDuplicateInput
): Promise<FindNearDuplicateResult | null> {
  const collection = await getProblemsCollection();

  const rows = await collection
    .aggregate<{
      similarity: number;
      doc: MongoProblemDocument;
    }>([
      {
        $vectorSearch: {
          index: ENV.MONGODB_VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector: input.embedding,
          numCandidates: 100,
          limit: 1,
          filter: {
            projectId: input.projectId,
          },
        },
      },
      {
        $project: {
          doc: "$$ROOT",
          similarity: { $meta: "vectorSearchScore" },
        },
      },
    ])
    .toArray();

  const top = rows[0];
  if (!top) return null;
  if (top.similarity < input.threshold) return null;
  return top;
}

export async function insertCanonicalProblem(
  input: InsertCanonicalProblemInput
): Promise<void> {
  const collection = await getProblemsCollection();
  const now = new Date();

  await collection.insertOne({
    projectId: input.projectId,
    canonical_problem_text: input.canonicalProblemText,
    canonical_root_cause: input.canonicalRootCause,
    embedding: input.embedding,
    occurrence_count: 1,
    max_intensity_score: input.intensityScore,
    supporting_quotes: normalizeUnique([input.supportingQuote]),
    verbatim_quotes: normalizeUnique([input.verbatimQuote]),
    first_seen_interview_id: input.interviewId,
    created_at: now,
    updated_at: now,
  });
}

export async function mergeIntoCanonicalProblem(
  input: MergeCanonicalProblemInput
): Promise<void> {
  const collection = await getProblemsCollection();
  const id = new ObjectId(input.id);
  const now = new Date();

  await collection.updateOne(
    { _id: id },
    {
      $max: { max_intensity_score: input.intensityScore },
      $inc: { occurrence_count: 1 },
      $set: { updated_at: now },
      $addToSet: {
        supporting_quotes: { $each: normalizeUnique([input.supportingQuote]) },
        verbatim_quotes: { $each: normalizeUnique([input.verbatimQuote]) },
      },
    }
  );
}

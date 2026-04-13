import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractedProblem } from "@/lib/interviews/types";
import { prepareProblemsForInsertWithSemanticDedup } from "@/lib/interviews/semanticDedup";

const {
  mockIsMongoConfigured,
  mockEmbedProblems,
  mockFindNearDuplicate,
  mockMergeIntoCanonicalProblem,
  mockInsertCanonicalProblem,
} = vi.hoisted(() => ({
  mockIsMongoConfigured: vi.fn(),
  mockEmbedProblems: vi.fn(),
  mockFindNearDuplicate: vi.fn(),
  mockMergeIntoCanonicalProblem: vi.fn(),
  mockInsertCanonicalProblem: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isMongoConfigured: mockIsMongoConfigured,
}));

vi.mock("@/lib/interviews/clusterProblems", () => ({
  embedProblems: mockEmbedProblems,
}));

vi.mock("@/lib/mongo/problemsRepo", () => ({
  findNearDuplicate: mockFindNearDuplicate,
  mergeIntoCanonicalProblem: mockMergeIntoCanonicalProblem,
  insertCanonicalProblem: mockInsertCanonicalProblem,
}));

function makeProblem(overrides: Partial<ExtractedProblem> = {}): ExtractedProblem {
  return {
    problem_text: "Onboarding takes too long",
    customer_type: "Founder",
    context: "First week setup",
    root_cause: "Manual setup requires too many steps",
    intensity_score: 4.2,
    confidence: 0.8,
    supporting_quote: "It took us three days to get started.",
    verbatim_quote: "It took us three days to get started",
    ...overrides,
  };
}

describe("prepareProblemsForInsertWithSemanticDedup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to plain insert rows when mongo is not configured", async () => {
    mockIsMongoConfigured.mockReturnValue(false);
    mockEmbedProblems.mockResolvedValue([
      { id: "0", embedding: [0.1, 0.2] },
    ]);

    const rows = await prepareProblemsForInsertWithSemanticDedup({
      projectId: "proj_1",
      interviewId: "int_1",
      problems: [makeProblem()],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].problem_text).toBe("Onboarding takes too long");
    expect(rows[0].embedding).toEqual([0.1, 0.2]);
    expect(mockFindNearDuplicate).not.toHaveBeenCalled();
  });

  it("canonicalizes row and merges evidence when near-duplicate exists", async () => {
    mockIsMongoConfigured.mockReturnValue(true);
    mockEmbedProblems.mockResolvedValue([
      { id: "0", embedding: [0.9, 0.1] },
    ]);
    mockFindNearDuplicate.mockResolvedValue({
      similarity: 0.97,
      doc: {
        _id: { toString: () => "507f1f77bcf86cd799439011" },
        projectId: "proj_1",
        canonical_problem_text: "Setup friction delays onboarding",
        canonical_root_cause: "Manual onboarding process",
      },
    });

    const rows = await prepareProblemsForInsertWithSemanticDedup({
      projectId: "proj_1",
      interviewId: "int_1",
      problems: [makeProblem()],
    });

    expect(mockMergeIntoCanonicalProblem).toHaveBeenCalledTimes(1);
    expect(mockInsertCanonicalProblem).not.toHaveBeenCalled();
    expect(rows[0].problem_text).toBe("Setup friction delays onboarding");
    expect(rows[0].root_cause).toBe("Manual onboarding process");
  });

  it("fails open when mongo query throws", async () => {
    mockIsMongoConfigured.mockReturnValue(true);
    mockEmbedProblems.mockResolvedValue([
      { id: "0", embedding: [0.3, 0.4] },
    ]);
    mockFindNearDuplicate.mockRejectedValue(new Error("mongo unavailable"));

    const rows = await prepareProblemsForInsertWithSemanticDedup({
      projectId: "proj_1",
      interviewId: "int_1",
      problems: [makeProblem()],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].problem_text).toBe("Onboarding takes too long");
    expect(rows[0].embedding).toEqual([0.3, 0.4]);
  });
});

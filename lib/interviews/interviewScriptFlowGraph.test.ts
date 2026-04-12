import { describe, expect, it } from "vitest";
import {
  buildInterviewScriptFlowGraph,
  FC_LAYOUT,
  questionNodeId,
} from "@/lib/interviews/interviewScriptFlowGraph";
import type { InterviewScript } from "@/lib/interviews/generateScript";

const fixture: Pick<InterviewScript, "intro" | "closing" | "sections"> = {
  intro: "Hello",
  closing: "Thanks",
  sections: [
    {
      title: "A",
      questions: [
        { question: "Q1?", probes: ["p1"] },
        { question: "Q2?", probes: [] },
      ],
    },
    {
      title: "B",
      questions: [{ question: "Q3?", probes: ["x"] }],
    },
  ],
};

describe("buildInterviewScriptFlowGraph", () => {
  it("produces spine ids opening → questions → closing", () => {
    const { spineIds } = buildInterviewScriptFlowGraph({
      ...fixture,
      contextLabel: "Ctx",
    });
    expect(spineIds).toEqual([
      "opening",
      questionNodeId(0, 0),
      questionNodeId(0, 1),
      questionNodeId(1, 0),
      "closing",
    ]);
  });

  it("places spine nodes on a horizontal line with fixed spacing", () => {
    const { nodes } = buildInterviewScriptFlowGraph({
      ...fixture,
      contextLabel: "Ctx",
    });
    const opening = nodes.find((n) => n.id === "opening");
    const q0 = nodes.find((n) => n.id === questionNodeId(0, 0));
    expect(opening?.position.y).toBe(FC_LAYOUT.spineY);
    expect(q0?.position.y).toBe(FC_LAYOUT.spineY);
    const dx = (q0?.position.x ?? 0) - (opening?.position.x ?? 0);
    expect(dx).toBe(FC_LAYOUT.nodeWidth + FC_LAYOUT.gap);
  });

  it("includes spine edges between consecutive spine ids plus decorative edges", () => {
    const { edges, spineIds } = buildInterviewScriptFlowGraph({
      ...fixture,
      contextLabel: "Ctx",
    });
    const spineEdgeCount = spineIds.length - 1;
    const decorative = edges.filter((e) => (e.data as { kind?: string })?.kind === "decorative");
    const spine = edges.filter((e) => (e.data as { kind?: string })?.kind === "spine");
    expect(spine.length).toBe(spineEdgeCount);
    expect(decorative.length).toBe(2);
  });
});

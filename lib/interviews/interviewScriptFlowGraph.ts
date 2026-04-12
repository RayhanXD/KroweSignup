import type { Edge, Node } from "@xyflow/react";
import type { InterviewScript } from "@/lib/interviews/generateScript";

/** Stable id for question nodes; matches legacy InterviewScriptTab. */
export function questionNodeId(sectionIndex: number, questionIndex: number): string {
  return `s${sectionIndex}-q${questionIndex}`;
}

export type SpineEdgeData = {
  kind: "spine";
  spineIndex: number;
};

export type DecorativeEdgeData = {
  kind: "decorative";
};

export type FounderConsoleGraph = {
  nodes: Node[];
  edges: Edge[];
  /** Linear order: opening → each question → closing (no decorative ids). */
  spineIds: string[];
};

const FC_NODE_W = 256;
const FC_GAP = 52;
const FC_SPINE_Y = 200;
const FC_PAD_X = 72;
const FC_CONTEXT_Y = 40;
const FC_ARCHIVE_OFFSET_Y = 168;

/** Exported for tests that assert layout spacing. */
export const FC_LAYOUT = {
  nodeWidth: FC_NODE_W,
  gap: FC_GAP,
  spineY: FC_SPINE_Y,
  padX: FC_PAD_X,
} as const;

function spineX(index: number): number {
  return FC_PAD_X + index * (FC_NODE_W + FC_GAP);
}

/**
 * Builds React Flow nodes/edges for a linear interview script with decorative Context + Archive nodes.
 */
export function buildInterviewScriptFlowGraph(args: {
  intro: string;
  closing: string;
  sections: InterviewScript["sections"];
  /** Shown on the faded Context card (e.g. project name or first section). */
  contextLabel: string;
  archiveLabel?: string;
}): FounderConsoleGraph {
  const { intro, closing, sections, contextLabel, archiveLabel } = args;

  const spineIds: string[] = ["opening"];
  sections.forEach((section, si) => {
    section.questions.forEach((_, qi) => {
      spineIds.push(questionNodeId(si, qi));
    });
  });
  spineIds.push("closing");

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const cardStyle = (minHeight: number) => ({
    width: FC_NODE_W,
    minHeight,
  });

  // Decorative: Context (top-left)
  nodes.push({
    id: "context",
    type: "fcContext",
    position: { x: FC_PAD_X, y: FC_CONTEXT_Y },
    data: { label: contextLabel },
    style: cardStyle(88),
  });

  // Spine: Opening
  nodes.push({
    id: "opening",
    type: "fcOpening",
    position: { x: spineX(0), y: FC_SPINE_Y },
    data: { text: intro, label: "Opening" as const },
    style: cardStyle(140),
  });

  // Questions
  let spineIdx = 1;
  sections.forEach((section, si) => {
    section.questions.forEach((q, qi) => {
      const id = questionNodeId(si, qi);
      nodes.push({
        id,
        type: "fcQuestion",
        position: { x: spineX(spineIdx), y: FC_SPINE_Y },
        data: {
          sectionTitle: section.title,
          question: q.question,
          probes: q.probes,
          sectionIndex: si,
          questionIndex: qi,
          questionCountInSection: section.questions.length,
        },
        style: cardStyle(160),
      });
      spineIdx += 1;
    });
  });

  // Closing
  const closingSpineIndex = spineIds.length - 1;
  nodes.push({
    id: "closing",
    type: "fcClosing",
    position: { x: spineX(closingSpineIndex), y: FC_SPINE_Y },
    data: { text: closing, label: "Closing" as const },
    style: cardStyle(140),
  });

  // Decorative: Archive (below closing)
  const archiveX = spineX(closingSpineIndex);
  nodes.push({
    id: "archive",
    type: "fcArchive",
    position: { x: archiveX, y: FC_SPINE_Y + FC_ARCHIVE_OFFSET_Y },
    data: { label: archiveLabel ?? "Competitor Matrix" },
    style: cardStyle(88),
  });

  // Edges: context → opening
  edges.push({
    id: "e-context-opening",
    source: "context",
    target: "opening",
    sourceHandle: "bottom",
    targetHandle: "top",
    type: "smoothstep",
    data: { kind: "decorative" } satisfies DecorativeEdgeData,
    style: { strokeDasharray: "4 4" },
  });

  // Spine chain
  for (let i = 0; i < spineIds.length - 1; i += 1) {
    const src = spineIds[i];
    const tgt = spineIds[i + 1];
    edges.push({
      id: `e-spine-${i}-${src}-${tgt}`,
      source: src,
      target: tgt,
      sourceHandle: "right",
      targetHandle: "left",
      type: "smoothstep",
      data: { kind: "spine", spineIndex: i } satisfies SpineEdgeData,
    });
  }

  // closing → archive
  edges.push({
    id: "e-closing-archive",
    source: "closing",
    target: "archive",
    sourceHandle: "bottom",
    targetHandle: "top",
    type: "smoothstep",
    data: { kind: "decorative" } satisfies DecorativeEdgeData,
    style: { strokeDasharray: "4 4" },
  });

  return { nodes, edges, spineIds };
}

export function getSpineEdgeHighlight(
  spineIds: string[],
  activeNodeId: string | null
): (edge: Edge) => { stroke: string; strokeWidth: number; opacity?: number } {
  const ai = activeNodeId ? spineIds.indexOf(activeNodeId) : -1;

  return (edge: Edge) => {
    const data = edge.data as SpineEdgeData | DecorativeEdgeData | undefined;
    if (!data || data.kind === "decorative") {
      return { stroke: "#d4d4d8", strokeWidth: 1.25 };
    }
    const spineIndex = (data as SpineEdgeData).spineIndex;
    const onPath = ai >= 0 && spineIndex < ai;
    if (onPath) {
      return { stroke: "#fb923c", strokeWidth: 2 };
    }
    return { stroke: "#d4d4d8", strokeWidth: 1.25, opacity: 0.85 };
  };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  GitBranch,
  PenLine,
  Share2,
} from "lucide-react";
import { arrayMove } from "@dnd-kit/sortable";

import type { InterviewScript } from "@/lib/interviews/generateScript";
import {
  buildInterviewScriptFlowGraph,
  getSpineEdgeHighlight,
  questionNodeId,
} from "@/lib/interviews/interviewScriptFlowGraph";
import { founderConsoleNodeTypes } from "./founderConsoleNodeTypes";
import { ScriptCanvasProvider } from "./scriptCanvasContext";

type NavDirection = "left" | "right" | "up" | "down" | "center";

function nodeSearchText(node: Node): string {
  const d = node.data as Record<string, unknown>;
  const t = node.type;
  if (t === "fcOpening" || t === "fcClosing") return String(d.text ?? "");
  if (t === "fcQuestion") {
    const probes = Array.isArray(d.probes) ? (d.probes as string[]).join(" ") : "";
    return `${d.sectionTitle ?? ""} ${d.question ?? ""} ${probes}`;
  }
  if (t === "fcContext" || t === "fcArchive") return String(d.label ?? "");
  return "";
}

function mergeNodeUi(
  nodes: Node[],
  activeNodeId: string | null,
  searchQuery: string
): Node[] {
  const q = searchQuery.trim().toLowerCase();
  return nodes.map((node) => {
    const text = nodeSearchText(node);
    const dimmed = q.length > 0 && !text.toLowerCase().includes(q);
    const active = activeNodeId !== null && node.id === activeNodeId;
    return {
      ...node,
      data: { ...node.data, active, dimmed },
    };
  });
}

function mergeEdgeStyles(edges: Edge[], spineIds: string[], activeNodeId: string | null): Edge[] {
  const pick = getSpineEdgeHighlight(spineIds, activeNodeId);
  return edges.map((e) => {
    const extra = pick(e);
    return {
      ...e,
      style: {
        ...e.style,
        ...extra,
      },
    };
  });
}

function FitViewWhenReady({ token }: { token: string | number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 280, minZoom: 0.15, maxZoom: 1.35 });
    });
    return () => cancelAnimationFrame(id);
  }, [token, fitView]);
  return null;
}

type ConsoleTab = "nodes" | "archive";

export function InterviewScriptTab({
  projectId,
  projectName = "",
}: {
  projectId: string;
  projectName?: string;
}) {
  const [script, setScript] = useState<InterviewScript | null>(null);
  const [sections, setSections] = useState<InterviewScript["sections"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("nodes");
  const focusRequestNonceRef = useRef(0);
  const [focusRequest, setFocusRequest] = useState<{
    nodeId: string;
    direction: NavDirection;
    nonce: number;
  } | null>(null);
  const hasAutoCentered = useRef(false);
  const [fitToken, setFitToken] = useState(0);

  const flowWrapRef = useRef<HTMLDivElement | null>(null);

  const contextLabel = useMemo(() => {
    const name = projectName.trim();
    return name.length > 0 ? `${name} · discovery context` : "Market & discovery context";
  }, [projectName]);

  const graph = useMemo(() => {
    if (!script) {
      return buildInterviewScriptFlowGraph({
        intro: "",
        closing: "",
        sections: [],
        contextLabel: contextLabel,
        archiveLabel: "Script archive",
      });
    }
    return buildInterviewScriptFlowGraph({
      intro: script.intro,
      closing: script.closing,
      sections,
      contextLabel,
      archiveLabel: "Past segments (placeholder)",
    });
  }, [script, sections, contextLabel]);

  const flowNodeOrder = useMemo(() => {
    const nodes: string[] = ["opening"];
    sections.forEach((section, sectionIndex) => {
      section.questions.forEach((_, questionIndex) => {
        nodes.push(questionNodeId(sectionIndex, questionIndex));
      });
    });
    nodes.push("closing");
    return nodes;
  }, [sections]);

  const flowNodeIndexById = useMemo(
    () => new Map(flowNodeOrder.map((id, index) => [id, index])),
    [flowNodeOrder]
  );

  const queueFocusOnNode = useCallback((nodeId: string, direction: NavDirection) => {
    focusRequestNonceRef.current += 1;
    setFocusRequest({ nodeId, direction, nonce: focusRequestNonceRef.current });
  }, []);

  const navigateToNodeByStep = useCallback(
    (direction: -1 | 1, fromNodeId?: string) => {
      if (flowNodeOrder.length === 0) return null;
      const currentId = fromNodeId ?? activeNodeId ?? flowNodeOrder[0];
      const currentIndex = flowNodeIndexById.get(currentId) ?? 0;
      const nextIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        flowNodeOrder.length - 1
      );
      const nextId = flowNodeOrder[nextIndex];
      setActiveNodeId(nextId);
      return nextId;
    },
    [activeNodeId, flowNodeIndexById, flowNodeOrder]
  );

  const findNearestNodeInDirection = useCallback(
    (direction: Exclude<NavDirection, "center">, fromNodeId?: string): string | null => {
      const currentId = fromNodeId ?? activeNodeId ?? flowNodeOrder[0];
      const current = graph.nodes.find((n) => n.id === currentId);
      if (!current) return null;

      let bestId: string | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const candidate of graph.nodes) {
        if (candidate.id === current.id) continue;
        const dx = candidate.position.x - current.position.x;
        const dy = candidate.position.y - current.position.y;

        const inDirection =
          (direction === "right" && dx > 12) ||
          (direction === "left" && dx < -12) ||
          (direction === "down" && dy > 12) ||
          (direction === "up" && dy < -12);
        if (!inDirection) continue;

        const primary = direction === "left" || direction === "right" ? Math.abs(dx) : Math.abs(dy);
        const secondary = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
        const score = primary + secondary * 0.45;
        if (score < bestScore) {
          bestScore = score;
          bestId = candidate.id;
        }
      }

      return bestId;
    },
    [activeNodeId, flowNodeOrder, graph.nodes]
  );

  const moveQuestion = useCallback((sectionIndex: number, questionIndex: number, delta: -1 | 1) => {
    setSections((prev) => {
      const sec = prev[sectionIndex];
      if (!sec) return prev;
      const next = questionIndex + delta;
      if (next < 0 || next >= sec.questions.length) return prev;
      return prev.map((s, i) =>
        i !== sectionIndex ? s : { ...s, questions: arrayMove(s.questions, questionIndex, next) }
      );
    });
    setFitToken((t) => t + 1);
  }, []);

  const moveQuestionValue = useMemo(
    () => ({ moveQuestion }),
    [moveQuestion]
  );

  async function fetchScript(regenerate = false) {
    hasAutoCentered.current = false;
    if (regenerate) setRegenerating(true);
    else setLoading(true);
    setError(null);
    try {
      const url = regenerate
        ? `/api/interviews/script/${projectId}?regenerate=true`
        : `/api/interviews/script/${projectId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to load script");
        return;
      }
      const data = await res.json();
      setScript(data as InterviewScript);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  useEffect(() => {
    fetchScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (script) setSections(script.sections);
  }, [script]);

  const styledNodes = useMemo(
    () => mergeNodeUi(graph.nodes, activeNodeId, searchQuery),
    [graph.nodes, activeNodeId, searchQuery]
  );

  const styledEdges = useMemo(
    () => mergeEdgeStyles(graph.edges, graph.spineIds, activeNodeId),
    [graph.edges, graph.spineIds, activeNodeId]
  );

  useEffect(() => {
    if (!script || hasAutoCentered.current) return;
    setActiveNodeId("opening");
    hasAutoCentered.current = true;
    setFitToken((t) => t + 1);
  }, [script]);

  useEffect(() => {
    if (flowNodeOrder.length === 0) {
      setActiveNodeId(null);
      return;
    }
    if (!activeNodeId || !flowNodeIndexById.has(activeNodeId)) {
      setActiveNodeId(flowNodeOrder[0]);
    }
  }, [activeNodeId, flowNodeIndexById, flowNodeOrder]);

  useEffect(() => {
    if (consoleTab !== "nodes") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const t = event.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        const first = flowNodeOrder[0];
        if (!first) return;
        setActiveNodeId(first);
        queueFocusOnNode(first, "center");
        setFitToken((x) => x + 1);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        const last = flowNodeOrder[flowNodeOrder.length - 1];
        if (!last) return;
        setActiveNodeId(last);
        queueFocusOnNode(last, "center");
        setFitToken((x) => x + 1);
        return;
      }
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        const direction =
          event.key === "ArrowLeft"
            ? "left"
            : event.key === "ArrowRight"
              ? "right"
              : event.key === "ArrowUp"
                ? "up"
                : "down";
        const directionalNodeId = findNearestNodeInDirection(direction);
        if (directionalNodeId) {
          setActiveNodeId(directionalNodeId);
          queueFocusOnNode(directionalNodeId, direction);
          return;
        }
        if (direction === "left" || direction === "right") {
          const nextId = navigateToNodeByStep(direction === "right" ? 1 : -1);
          if (nextId) queueFocusOnNode(nextId, direction);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [consoleTab, findNearestNodeInDirection, flowNodeOrder, navigateToNodeByStep, queueFocusOnNode]);

  function buildPlainText(): string {
    if (!script) return "";
    const lines: string[] = [];
    lines.push(script.intro);
    lines.push("");
    for (const section of sections) {
      lines.push(`--- ${section.title} ---`);
      lines.push("");
      for (const q of section.questions) {
        lines.push(`Q: ${q.question}`);
        for (const probe of q.probes) {
          lines.push(`  → ${probe}`);
        }
        lines.push("");
      }
    }
    lines.push(script.closing);
    return lines.join("\n");
  }

  async function handleCopy() {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(buildPlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleDownload() {
    if (!script) return;
    const blob = new Blob([buildPlainText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-script-${projectId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="h-full min-h-[22rem] flex flex-col items-center justify-center gap-3 text-muted-foreground px-6">
        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
        <p className="text-sm">Generating your interview script…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full min-h-[22rem] flex flex-col items-center justify-center gap-3 text-muted-foreground px-6">
        <p className="text-sm text-danger">{error}</p>
        <button
          type="button"
          onClick={() => fetchScript()}
          className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!script) return null;

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col bg-background">
      {/* Founder Console header */}
      <div className="shrink-0 border-b border-border/60 bg-background px-4 py-3.5 md:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Founder Console
            </p>
            <nav className="flex items-center gap-1 border-b border-transparent">
              {(
                [
                  ["nodes", "Nodes"],
                  ["archive", "Archive"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setConsoleTab(id)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    consoleTab === id
                      ? "border-interview-brand text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search canvas…"
              className="h-9 w-full min-w-[12rem] max-w-xs rounded-full border border-border/80 bg-background px-3 text-xs outline-none transition focus:border-interview-brand/50 focus:ring-2 focus:ring-interview-brand/10"
              aria-label="Search canvas"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-interview-brand to-primary-hover px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95"
            >
              {copied ? "Copied" : "Deploy script"}
            </button>
            <button
              type="button"
              onClick={() => fetchScript(true)}
              disabled={regenerating}
              className="rounded-full border border-border/80 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        </div>
      </div>

      {consoleTab === "archive" && (
        <div className="flex-1 min-h-[16rem] flex flex-col items-center justify-center px-6 text-center gap-2">
          <p className="text-sm text-muted-foreground max-w-md">
            Regenerating replaces the stored script for this project. Version history for past scripts is not enabled yet.
          </p>
          <p className="text-[11px] text-muted-foreground">Archive nodes on the canvas are visual placeholders.</p>
        </div>
      )}

      {consoleTab === "nodes" && (
        <div ref={flowWrapRef} className="relative flex-1 min-h-0 w-full">
          <ScriptCanvasProvider value={moveQuestionValue}>
            <ReactFlowProvider>
              <div className="absolute inset-0">
                <FlowCanvasInner
                  nodes={styledNodes}
                  edges={styledEdges}
                  fitToken={fitToken}
                  activeNodeId={activeNodeId}
                  focusRequest={focusRequest}
                  onNodeClick={(id) => setActiveNodeId(id)}
                  onExportDownload={handleDownload}
                  onExportCopy={handleCopy}
                />
              </div>
            </ReactFlowProvider>
          </ScriptCanvasProvider>

          <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex gap-1 rounded-full border border-border/70 bg-background/90 p-1 shadow-md backdrop-blur">
            <button
              type="button"
              onClick={() => {
                const first = flowNodeOrder[0];
                if (!first) return;
                setActiveNodeId(first);
                setFitToken((t) => t + 1);
              }}
              className="pointer-events-auto rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => navigateToNodeByStep(-1)}
              className="pointer-events-auto rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Previous"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigateToNodeByStep(1)}
              className="pointer-events-auto rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Next"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                const last = flowNodeOrder[flowNodeOrder.length - 1];
                if (!last) return;
                setActiveNodeId(last);
                setFitToken((t) => t + 1);
              }}
              className="pointer-events-auto rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
            >
              End
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowCanvasInner({
  nodes,
  edges,
  fitToken,
  activeNodeId,
  focusRequest,
  onNodeClick,
  onExportDownload,
  onExportCopy,
}: {
  nodes: Node[];
  edges: Edge[];
  fitToken: string | number;
  activeNodeId: string | null;
  focusRequest: { nodeId: string; direction: NavDirection; nonce: number } | null;
  onNodeClick: (id: string) => void;
  onExportDownload: () => void;
  onExportCopy: () => void;
}) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);
  const { fitView, getZoom, setCenter } = useReactFlow();

  useEffect(() => {
    setRfNodes(nodes);
  }, [nodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(edges);
  }, [edges, setRfEdges]);

  useEffect(() => {
    if (!focusRequest) return;
    const target = rfNodes.find((n) => n.id === focusRequest.nodeId);
    if (!target) return;

    const widthFromStyle = typeof target.style?.width === "number" ? target.style.width : null;
    const heightFromStyle = typeof target.style?.height === "number" ? target.style.height : null;
    const nodeWidth = target.measured?.width ?? widthFromStyle ?? 256;
    const nodeHeight = target.measured?.height ?? heightFromStyle ?? 160;
    const centerX = target.position.x + nodeWidth / 2;
    const centerY = target.position.y + nodeHeight / 2;
    const zoom = Math.max(0.22, Math.min(getZoom() || 0.6, 1.3));
    const worldOffset = 130 / zoom;

    let offsetX = 0;
    let offsetY = 0;
    if (focusRequest.direction === "right") offsetX = worldOffset;
    if (focusRequest.direction === "left") offsetX = -worldOffset;
    if (focusRequest.direction === "down") offsetY = worldOffset * 0.85;
    if (focusRequest.direction === "up") offsetY = -worldOffset * 0.85;

    requestAnimationFrame(() => {
      setCenter(centerX + offsetX, centerY + offsetY, { zoom, duration: 240 });
    });
  }, [focusRequest, getZoom, rfNodes, setCenter]);

  return (
    <>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, n) => onNodeClick(n.id)}
        nodeTypes={founderConsoleNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        minZoom={0.12}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      >
        <FitViewWhenReady token={fitToken} />
        <Background gap={22} size={1} color="rgba(24,24,27,0.14)" className="!bg-transparent" />
        <Controls
          className="!rounded-full !border !border-border/70 !bg-background/90 !shadow-md [&_button]:!border-border/60"
          showInteractive={false}
        />
        <MiniMap
          className="!rounded-xl !border !border-border/60 !bg-background/85"
          maskColor="rgba(0,0,0,0.12)"
          nodeStrokeWidth={2}
        />
        <Panel position="bottom-center" className="m-0 mb-4">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur">
            <button
              type="button"
              title="Fit canvas"
              onClick={() => {
                requestAnimationFrame(() =>
                  fitView({ padding: 0.18, duration: 240, minZoom: 0.12, maxZoom: 1.6 })
                );
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-interview-brand/15 text-interview-brand hover:bg-interview-brand/25"
            >
              <PenLine size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              title="Branching (linear script for now)"
              disabled
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground opacity-40"
            >
              <GitBranch size={16} />
            </button>
            <button
              type="button"
              title="Focus active node"
              onClick={() => {
                if (!activeNodeId) return;
                requestAnimationFrame(() =>
                  fitView({
                    nodes: [{ id: activeNodeId }],
                    padding: 0.45,
                    duration: 280,
                    minZoom: 0.12,
                    maxZoom: 1.45,
                  })
                );
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              disabled={!activeNodeId}
            >
              <Eye size={16} />
            </button>
            <div className="mx-1 h-6 w-px bg-border/80" />
            <button
              type="button"
              title="Download .txt"
              onClick={onExportDownload}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Share2 size={16} />
            </button>
            <button
              type="button"
              title="Copy script"
              onClick={onExportCopy}
              className="ml-0.5 rounded-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted"
            >
              Copy
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </>
  );
}

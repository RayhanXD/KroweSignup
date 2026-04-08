"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragMoveEvent,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { InterviewScript } from "@/lib/interviews/generateScript";

function questionNodeId(sectionIndex: number, questionIndex: number) {
  return `s${sectionIndex}-q${questionIndex}`;
}

// ── QuestionNode ──────────────────────────────────────────────────────────────

function QuestionNode({
  id,
  question,
  probes,
  active,
  onActivate,
  registerFlowNodeRef,
}: {
  id: string;
  question: string;
  probes: string[];
  active: boolean;
  onActivate: () => void;
  registerFlowNodeRef: (el: HTMLDivElement | null) => void;
}) {
  const [probesOpen, setProbesOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        registerFlowNodeRef(el);
      }}
      onPointerDownCapture={onActivate}
      style={style}
      className={`w-64 shrink-0 rounded-xl border bg-card/95 p-4 shadow-sm backdrop-blur-sm flex flex-col gap-3 ${
        active ? "border-primary/60 ring-2 ring-primary/25" : "border-border/70"
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        data-drag-handle="true"
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors self-start -mt-1 -ml-1"
      >
        <GripVertical size={14} />
      </div>

      {/* Question text */}
      <p className="text-sm font-medium text-foreground leading-snug">{question}</p>

      {/* Probes toggle */}
      {probes.length > 0 && (
        <div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setProbesOpen((o) => !o)}
            className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            {probesOpen ? "Hide probes" : `Probes (${probes.length})`}
          </button>
          {probesOpen && (
            <ul className="mt-2 space-y-1">
              {probes.map((probe, pi) => (
                <li key={pi} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-muted-foreground/50 shrink-0 mt-0.5">→</span>
                  <span>{probe}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── SectionGroup ──────────────────────────────────────────────────────────────

function SectionGroup({
  sectionIndex,
  title,
  questions,
  activeNodeId,
  onActivateNode,
  registerFlowNodeRef,
  onNavigateFromNode,
}: {
  sectionIndex: number;
  title: string;
  questions: InterviewScript["sections"][number]["questions"];
  activeNodeId: string | null;
  onActivateNode: (nodeId: string) => void;
  registerFlowNodeRef: (nodeId: string, el: HTMLDivElement | null) => void;
  onNavigateFromNode: (fromNodeId: string, direction: -1 | 1) => void;
}) {
  const ids = questions.map((_, qi) => questionNodeId(sectionIndex, qi));

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
        {title}
      </p>
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <div className="flex items-start gap-2">
          {questions.flatMap((q, qi) => {
            const node = (
              <QuestionNode
                key={ids[qi]}
                id={ids[qi]}
                question={q.question}
                probes={q.probes}
                active={activeNodeId === ids[qi]}
                onActivate={() => onActivateNode(ids[qi])}
                registerFlowNodeRef={(el) => registerFlowNodeRef(ids[qi], el)}
              />
            );
            if (qi < questions.length - 1) {
              return [
                node,
                <button
                  key={`arrow-${qi}`}
                  type="button"
                  data-no-pan="true"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onNavigateFromNode(ids[qi], 1)}
                  className="flex items-center self-start mt-9 shrink-0 rounded-full border border-border/60 bg-background/80 px-1.5 py-1 text-muted-foreground/55 hover:text-foreground hover:border-border transition-colors"
                  aria-label="Go to next question"
                >
                  <ChevronRight size={14} />
                </button>,
              ];
            }
            return [node];
          })}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Flow static card (Intro / Closing) ────────────────────────────────────────

function FlowStaticCard({
  label,
  text,
  active,
  onActivate,
  registerFlowNodeRef,
}: {
  label: string;
  text: string;
  active: boolean;
  onActivate: () => void;
  registerFlowNodeRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
        {label}
      </p>
      <div
        ref={registerFlowNodeRef}
        onPointerDownCapture={onActivate}
        className={`w-64 rounded-xl border bg-card/95 p-4 shadow-sm backdrop-blur-sm ${
          active ? "border-primary/60 ring-2 ring-primary/25" : "border-border/70"
        }`}
      >
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function InterviewScriptTab({ projectId }: { projectId: string }) {
  const [script, setScript] = useState<InterviewScript | null>(null);
  const [sections, setSections] = useState<InterviewScript["sections"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingQuestion, setIsDraggingQuestion] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const flowNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasAutoCentered = useRef(false);
  const dragPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragAutoScrollRaf = useRef<number | null>(null);
  const panState = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    pointerId: number | null;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    pointerId: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  const getHorizontalBounds = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return { maxLeft: 0 };
    return {
      maxLeft: Math.max(container.scrollWidth - container.clientWidth, 0),
    };
  }, []);

  const registerFlowNodeRef = useCallback((nodeId: string, el: HTMLDivElement | null) => {
    flowNodeRefs.current[nodeId] = el;
  }, []);

  const scrollNodeIntoView = useCallback((nodeId: string) => {
    const container = canvasRef.current;
    const node = flowNodeRefs.current[nodeId];
    if (!container || !node) return;

    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const nextLeft =
      nodeRect.left -
      containerRect.left +
      container.scrollLeft -
      (container.clientWidth - nodeRect.width) / 2;

    const nodeTop = nodeRect.top - containerRect.top + container.scrollTop;
    const isVerticallyOutOfBounds =
      nodeRect.top < containerRect.top || nodeRect.bottom > containerRect.bottom;
    const nextTop = isVerticallyOutOfBounds
      ? nodeTop - (container.clientHeight - nodeRect.height) / 2
      : container.scrollTop;
    const { maxLeft } = getHorizontalBounds();
    const maxTop = Math.max(container.scrollHeight - container.clientHeight, 0);

    container.scrollTo({
      left: Math.min(Math.max(nextLeft, 0), maxLeft),
      top: Math.min(Math.max(nextTop, 0), maxTop),
      behavior: "smooth",
    });
  }, [getHorizontalBounds]);

  const navigateToNodeByStep = useCallback(
    (direction: -1 | 1, fromNodeId?: string) => {
      if (flowNodeOrder.length === 0) return;
      const currentId = fromNodeId ?? activeNodeId ?? flowNodeOrder[0];
      const currentIndex = flowNodeIndexById.get(currentId) ?? 0;
      const nextIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        flowNodeOrder.length - 1
      );
      const nextId = flowNodeOrder[nextIndex];
      setActiveNodeId(nextId);
      scrollNodeIntoView(nextId);
    },
    [activeNodeId, flowNodeIndexById, flowNodeOrder, scrollNodeIntoView]
  );

  const stopDragAutoScroll = useCallback(() => {
    if (dragAutoScrollRaf.current !== null) {
      cancelAnimationFrame(dragAutoScrollRaf.current);
      dragAutoScrollRaf.current = null;
    }
  }, []);

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

  // Sync sections state when script loads or regenerates
  useEffect(() => {
    if (script) setSections(script.sections);
  }, [script]);

  // Center the script flow in the grid after data loads.
  // Keep a fixed-size dependency array; never spread flowNodeOrder into deps.
  useEffect(() => {
    if (!script || hasAutoCentered.current) return;

    const raf = requestAnimationFrame(() => {
      const startNodeId = "opening";
      setActiveNodeId(startNodeId);
      scrollNodeIntoView(startNodeId);
      hasAutoCentered.current = true;
    });

    return () => cancelAnimationFrame(raf);
  }, [script, scrollNodeIntoView, flowNodeOrder]);

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
    if (!isDraggingQuestion) return;

    const onPointerMove = (event: PointerEvent) => {
      dragPointer.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const edgeThreshold = 140;
    const maxSpeed = 18;
    const tick = () => {
      const container = canvasRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const { x } = dragPointer.current;

      let velocityX = 0;
      if (x < rect.left + edgeThreshold) {
        const pressure = (rect.left + edgeThreshold - x) / edgeThreshold;
        velocityX = -(Math.min(Math.max(pressure, 0), 1) ** 1.4) * maxSpeed;
      } else if (x > rect.right - edgeThreshold) {
        const pressure = (x - (rect.right - edgeThreshold)) / edgeThreshold;
        velocityX = Math.min(Math.max(pressure, 0), 1) ** 1.4 * maxSpeed;
      }

      if (velocityX !== 0) {
        const { maxLeft } = getHorizontalBounds();
        container.scrollLeft = Math.min(
          Math.max(container.scrollLeft + velocityX, 0),
          Math.max(maxLeft, 0)
        );
      }

      dragAutoScrollRaf.current = requestAnimationFrame(tick);
    };

    dragAutoScrollRaf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      stopDragAutoScroll();
    };
  }, [getHorizontalBounds, isDraggingQuestion, stopDragAutoScroll]);

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
      // ignore clipboard errors
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setIsDraggingQuestion(true);
    const sourceEvent = event.activatorEvent;
    if (sourceEvent instanceof PointerEvent || sourceEvent instanceof MouseEvent) {
      dragPointer.current = { x: sourceEvent.clientX, y: sourceEvent.clientY };
      return;
    }
    if (sourceEvent instanceof TouchEvent && sourceEvent.touches.length > 0) {
      dragPointer.current = {
        x: sourceEvent.touches[0].clientX,
        y: sourceEvent.touches[0].clientY,
      };
    }
  }

  function handleDragMove(event: DragMoveEvent) {
    const sourceEvent = event.activatorEvent;
    if (sourceEvent instanceof PointerEvent || sourceEvent instanceof MouseEvent) {
      dragPointer.current = { x: sourceEvent.clientX, y: sourceEvent.clientY };
      return;
    }
    if (sourceEvent instanceof TouchEvent && sourceEvent.touches.length > 0) {
      dragPointer.current = {
        x: sourceEvent.touches[0].clientX,
        y: sourceEvent.touches[0].clientY,
      };
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setIsDraggingQuestion(false);
    stopDragAutoScroll();
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const parseId = (id: string | number) => {
      const parts = String(id).split("-");
      return {
        si: parseInt(parts[0].slice(1), 10),
        qi: parseInt(parts[1].slice(1), 10),
      };
    };

    const { si: activeSI, qi: activeQI } = parseId(active.id);
    const { si: overSI, qi: overQI } = parseId(over.id);

    if (activeSI !== overSI) return; // within-section only

    const nextActiveId = String(active.id);
    setActiveNodeId(nextActiveId);
    setSections((prev) =>
      prev.map((s, i) =>
        i !== activeSI
          ? s
          : { ...s, questions: arrayMove(s.questions, activeQI, overQI) }
      )
    );
    requestAnimationFrame(() => scrollNodeIntoView(nextActiveId));
  }

  function handleDragCancel() {
    setIsDraggingQuestion(false);
    stopDragAutoScroll();
  }

  function shouldStartPan(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return !target.closest(
      "button,a,input,textarea,select,[role='button'],[data-drag-handle='true'],[data-no-pan='true']"
    );
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (isDraggingQuestion) return;
    if (event.button !== 0 || !shouldStartPan(event.target)) return;
    const container = canvasRef.current;
    if (!container) return;

    panState.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      pointerId: event.pointerId,
    };
    setIsPanning(true);
    container.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const container = canvasRef.current;
    if (!container || !panState.current.active) return;
    const dx = event.clientX - panState.current.startX;
    const dy = event.clientY - panState.current.startY;
    container.scrollLeft = panState.current.scrollLeft - dx;
    container.scrollTop = panState.current.scrollTop - dy;
  }

  function stopPanning() {
    const container = canvasRef.current;
    if (container && panState.current.pointerId !== null) {
      try {
        container.releasePointerCapture(panState.current.pointerId);
      } catch {
        // no-op when pointer capture is already released
      }
    }
    panState.current.active = false;
    panState.current.pointerId = null;
    setIsPanning(false);
  }

  function handleCanvasKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (isDraggingQuestion) return;

    const target = event.target as HTMLElement | null;
    if (
      target &&
      target.closest("input,textarea,select,button,a,[contenteditable='true'],[role='button']")
    ) {
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstNode = flowNodeOrder[0];
      if (!firstNode) return;
      setActiveNodeId(firstNode);
      scrollNodeIntoView(firstNode);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastNode = flowNodeOrder[flowNodeOrder.length - 1];
      if (!lastNode) return;
      setActiveNodeId(lastNode);
      scrollNodeIntoView(lastNode);
      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    navigateToNodeByStep(event.key === "ArrowRight" ? 1 : -1);
  }

  function handleCanvasWheel(event: React.WheelEvent<HTMLDivElement>) {
    const container = canvasRef.current;
    if (!container) return;

    const horizontalDelta = event.deltaX !== 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (horizontalDelta === 0) return;

    const { maxLeft } = getHorizontalBounds();
    event.preventDefault();
    container.scrollLeft = Math.min(
      Math.max(container.scrollLeft + horizontalDelta, 0),
      Math.max(maxLeft, 0)
    );
  }

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const container = canvasRef.current;
    if (!container) return;
    const { maxLeft } = getHorizontalBounds();
    console.debug("[InterviewScriptTab] scroll metrics", {
      activeNodeId,
      scrollLeft: container.scrollLeft,
      maxLeft,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
    });
  }, [activeNodeId, getHorizontalBounds]);

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
        <p className="text-sm text-red-500">{error}</p>
        <button
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
    <div className="flex flex-1 min-h-0 w-full flex-col">
      {/* Non-scrolling overlay wrapper around the scrollable canvas */}
      <div className="relative flex-1 min-h-0">
      {/* Draggable canvas with immersive grid */}
      <div
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={stopPanning}
        onPointerCancel={stopPanning}
        onKeyDown={handleCanvasKeyDown}
        onWheel={handleCanvasWheel}
        onPointerLeave={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          stopPanning();
        }}
        tabIndex={0}
        className={`relative h-full w-full min-h-0 overflow-auto select-none outline-none ${isPanning || isDraggingQuestion ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(24,24,27,0.18) 1px, transparent 1px), radial-gradient(ellipse at top, rgba(249,115,22,0.08), transparent 50%), linear-gradient(180deg, rgba(250,250,250,0.96), rgba(244,244,245,0.9))",
          backgroundSize: "22px 22px, 100% 100%, 100% 100%",
          backgroundPosition: "0 0, center top, center",
          touchAction: "none",
        }}
      >
        <div className="pointer-events-none sticky top-2 left-1/2 z-20 -translate-x-1/2 px-3 w-max max-w-full">
          <div className="pointer-events-auto flex w-fit max-w-full items-center gap-2 rounded-full border border-border/80 bg-background/90 px-2.5 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="min-w-0">
              <h2 className="text-[11px] font-semibold leading-tight">Interview Script</h2>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                Tailored guide for your discovery calls.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchScript(true)}
                disabled={regenerating}
                className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
              >
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                onClick={handleCopy}
                className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-muted transition-colors shrink-0"
              >
                {copied ? "Copied!" : "Copy Script"}
              </button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background/65 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background/65 to-transparent" />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex min-h-full w-max items-center pt-14">
            <div className="h-px min-w-[40vw] shrink-0" />
            <div className="flex min-w-max items-start gap-4 px-0 py-0">
            {/* Opening */}
            <FlowStaticCard
              label="Opening"
              text={script.intro}
              active={activeNodeId === "opening"}
              onActivate={() => setActiveNodeId("opening")}
              registerFlowNodeRef={(el) => registerFlowNodeRef("opening", el)}
            />

            {/* Arrow → first section */}
            <button
              type="button"
              data-no-pan="true"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => navigateToNodeByStep(1, "opening")}
              className="flex items-start shrink-0 mt-4 rounded-full border border-border/60 bg-background/80 px-1.5 py-1 text-muted-foreground/55 hover:text-foreground hover:border-border transition-colors"
              aria-label="Go to next question"
            >
              <ChevronRight size={14} />
            </button>

            {/* Sections */}
            {sections.map((section, si) => (
              <Fragment key={si}>
                <SectionGroup
                  sectionIndex={si}
                  title={section.title}
                  questions={section.questions}
                  activeNodeId={activeNodeId}
                  onActivateNode={setActiveNodeId}
                  registerFlowNodeRef={registerFlowNodeRef}
                  onNavigateFromNode={(fromNodeId, direction) =>
                    navigateToNodeByStep(direction, fromNodeId)
                  }
                />
                {si < sections.length - 1 && (
                  <button
                    type="button"
                    data-no-pan="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => navigateToNodeByStep(1, questionNodeId(si, section.questions.length - 1))}
                    className="flex items-start shrink-0 mt-4 rounded-full border border-border/60 bg-background/80 px-1.5 py-1 text-muted-foreground/55 hover:text-foreground hover:border-border transition-colors"
                    aria-label="Go to next question section"
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
              </Fragment>
            ))}

            {/* Arrow → closing */}
            <button
              type="button"
              data-no-pan="true"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                navigateToNodeByStep(
                  1,
                  sections.length > 0 && sections[sections.length - 1].questions.length > 0
                    ? questionNodeId(
                        sections.length - 1,
                        sections[sections.length - 1].questions.length - 1
                      )
                    : "opening"
                )
              }
              className="flex items-start shrink-0 mt-4 rounded-full border border-border/60 bg-background/80 px-1.5 py-1 text-muted-foreground/55 hover:text-foreground hover:border-border transition-colors"
              aria-label="Go to closing"
            >
              <ChevronRight size={14} />
            </button>

            {/* Closing */}
            <FlowStaticCard
              label="Closing"
              text={script.closing}
              active={activeNodeId === "closing"}
              onActivate={() => setActiveNodeId("closing")}
              registerFlowNodeRef={(el) => registerFlowNodeRef("closing", el)}
            />
            </div>
            <div className="h-px min-w-[40vw] shrink-0" />
          </div>
        </DndContext>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-30">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            data-no-pan="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              const firstNode = flowNodeOrder[0];
              if (!firstNode) return;
              setActiveNodeId(firstNode);
              scrollNodeIntoView(firstNode);
            }}
            className="rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Jump to first question"
          >
            Start
          </button>
          <button
            type="button"
            data-no-pan="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => navigateToNodeByStep(-1)}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Previous question"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            data-no-pan="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => navigateToNodeByStep(1)}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Next question"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            data-no-pan="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              const lastNode = flowNodeOrder[flowNodeOrder.length - 1];
              if (!lastNode) return;
              setActiveNodeId(lastNode);
              scrollNodeIntoView(lastNode);
            }}
            className="rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Jump to last question"
          >
            End
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

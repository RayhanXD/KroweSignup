"use client";

import { memo, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronUp, Clock, GripVertical } from "lucide-react";
import { useScriptCanvas } from "./scriptCanvasContext";

type FcContextData = { label: string; active?: boolean; dimmed?: boolean };
type FcArchiveData = { label: string; active?: boolean; dimmed?: boolean };
type FcTextCardData = { text: string; active?: boolean; dimmed?: boolean; label: "Opening" | "Closing" };
type FcQuestionData = {
  sectionTitle: string;
  question: string;
  probes: string[];
  sectionIndex: number;
  questionIndex: number;
  questionCountInSection: number;
  active?: boolean;
  dimmed?: boolean;
};

function estimateMinutes(probes: string[]): number {
  return 3 + Math.min(Math.max(probes.length, 0), 5);
}

export const FcContextNode = memo(function FcContextNode({ data }: NodeProps<Node<FcContextData>>) {
  const active = data.active ?? false;
  const dimmed = data.dimmed ?? false;
  return (
    <div
      className={`relative w-full rounded-xl border bg-muted/30 px-3 py-2.5 shadow-sm transition-[box-shadow,opacity,border-color] ${
        active ? "border-interview-brand/65 ring-2 ring-interview-brand/20" : "border-border/50"
      } ${
        dimmed ? "opacity-35" : "opacity-90"
      }`}
    >
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-zinc-400 !border-0 !size-2" />
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">Context</p>
      <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{data.label}</p>
    </div>
  );
});

export const FcArchiveNode = memo(function FcArchiveNode({ data }: NodeProps<Node<FcArchiveData>>) {
  const active = data.active ?? false;
  const dimmed = data.dimmed ?? false;
  return (
    <div
      className={`relative w-full rounded-xl border bg-muted/30 px-3 py-2.5 shadow-sm transition-[box-shadow,opacity,border-color] ${
        active ? "border-interview-brand/65 ring-2 ring-interview-brand/20" : "border-border/50"
      } ${
        dimmed ? "opacity-35" : "opacity-90"
      }`}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-zinc-400 !border-0 !size-2" />
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">Archive</p>
      <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{data.label}</p>
    </div>
  );
});

export const FcOpeningNode = memo(function FcOpeningNode({ data }: NodeProps<Node<FcTextCardData>>) {
  const active = data.active ?? false;
  const dimmed = data.dimmed ?? false;
  return (
    <div
      className={`relative w-full rounded-xl border bg-card px-3.5 py-3 shadow-md transition-[box-shadow,opacity] ${
        active ? "border-interview-brand ring-2 ring-interview-brand/25 shadow-[0_8px_30px_-8px_var(--interview-brand-glow)]" : "border-border/70"
      } ${dimmed ? "opacity-35" : ""}`}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-zinc-400 !border-0 !size-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-interview-brand !border-0 !size-2" />
      {active && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-interview-brand" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-interview-brand">Active thread</span>
        </div>
      )}
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{data.label}</p>
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">{data.text}</p>
    </div>
  );
});

export const FcClosingNode = memo(function FcClosingNode({ data }: NodeProps<Node<FcTextCardData>>) {
  const active = data.active ?? false;
  const dimmed = data.dimmed ?? false;
  return (
    <div
      className={`relative w-full rounded-xl border bg-card px-3.5 py-3 shadow-md transition-[box-shadow,opacity] ${
        active ? "border-interview-brand ring-2 ring-interview-brand/25 shadow-[0_8px_30px_-8px_var(--interview-brand-glow)]" : "border-border/70"
      } ${dimmed ? "opacity-35" : ""}`}
    >
      <Handle type="target" position={Position.Left} id="left" className="!bg-zinc-400 !border-0 !size-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-zinc-400 !border-0 !size-2" />
      {active && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-interview-brand" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-interview-brand">Active thread</span>
        </div>
      )}
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{data.label}</p>
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">{data.text}</p>
    </div>
  );
});

export const FcQuestionNode = memo(function FcQuestionNode({ data }: NodeProps<Node<FcQuestionData>>) {
  const { moveQuestion } = useScriptCanvas();
  const [probesOpen, setProbesOpen] = useState(false);
  const active = data.active ?? false;
  const dimmed = data.dimmed ?? false;
  const mins = estimateMinutes(data.probes);
  const section = data.sectionTitle;
  const n = data.sectionIndex;
  const qi = data.questionIndex;

  return (
    <div
      className={`relative w-full rounded-xl border bg-card px-3.5 py-3 shadow-md transition-[box-shadow,opacity] ${
        active ? "border-interview-brand ring-2 ring-interview-brand/25 shadow-[0_8px_30px_-8px_var(--interview-brand-glow)]" : "border-border/70"
      } ${dimmed ? "opacity-35" : ""}`}
    >
      <Handle type="target" position={Position.Left} id="left" className="!bg-zinc-400 !border-0 !size-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-interview-brand !border-0 !size-2" />

      {active && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-interview-brand" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-interview-brand">Active thread</span>
        </div>
      )}

      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/90 mb-1 line-clamp-1">
        {section}
      </p>
      <p className="serif-text text-[15px] font-semibold text-foreground leading-snug">{data.question}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock size={12} className="shrink-0 opacity-70" />
          <span>{mins} min</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-interview-brand/90" title="Primary" />
          <span className="h-2 w-2 rounded-full bg-sky-300/90" title="Secondary" />
        </div>
      </div>

      {data.probes.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            className="nopan text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setProbesOpen((o) => !o)}
          >
            {probesOpen ? "Hide probes" : `Probes (${data.probes.length})`}
          </button>
          {probesOpen && (
            <ul className="mt-2 space-y-1">
              {data.probes.map((probe, pi) => (
                <li key={pi} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-muted-foreground/50 shrink-0 mt-0.5">→</span>
                  <span>{probe}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {active && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <div className="flex items-center gap-1 text-muted-foreground/50">
            <GripVertical size={14} />
            <span className="text-[10px] uppercase tracking-wide">Reorder</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="nopan rounded-md border border-border/70 bg-background px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Move question earlier in section"
              disabled={qi <= 0}
              onClick={() => moveQuestion(n, qi, -1)}
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              className="nopan rounded-md border border-border/70 bg-background px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Move question later in section"
              disabled={qi >= data.questionCountInSection - 1}
              onClick={() => moveQuestion(n, qi, 1)}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export const founderConsoleNodeTypes = {
  fcContext: FcContextNode,
  fcArchive: FcArchiveNode,
  fcOpening: FcOpeningNode,
  fcClosing: FcClosingNode,
  fcQuestion: FcQuestionNode,
} as const;

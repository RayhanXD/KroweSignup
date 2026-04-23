"use client";

import { useEffect, useState } from "react";
import { EmberGlyph } from "@/app/components/krowe/EmberGlyph";

const STEPS = [
  { key: "ingest", label: "Ingesting transcripts" },
  { key: "extract", label: "Extracting signals & quotes" },
  { key: "cluster", label: "Clustering problems" },
  { key: "rank", label: "Ranking by evidence strength" },
  { key: "verdict", label: "Generating verdict & confidence" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  isProcessing: boolean;
};

export function AnalysisModal({ open, onClose, isProcessing }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 650);
    return () => {
      clearInterval(iv);
      setStep(0);
    };
  }, [open]);

  useEffect(() => {
    if (!isProcessing && open) {
      const t = setTimeout(onClose, 900);
      return () => clearTimeout(t);
    }
  }, [isProcessing, open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-live-insights-bg border border-live-insights-border shadow-[var(--shadow-3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-live-insights-border px-5 py-4">
          <div className="flex items-center gap-2 text-live-insights-foreground font-semibold text-sm">
            <span className="material-symbols-outlined text-interview-brand text-base">auto_awesome</span>
            Live analysis running
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-live-insights-muted hover:text-live-insights-foreground transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="px-5 py-3 text-sm text-live-insights-muted border-b border-live-insights-border">
          Re-synthesizing all interviews. Clusters, quotes, and the decision verdict will refresh when complete.
        </div>

        <div className="px-5 py-4 space-y-3">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "pending";
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                    state === "done"
                      ? "border-success/50 bg-success/10 text-success"
                      : state === "active"
                      ? "border-primary/60 bg-primary/10"
                      : "border-live-insights-border bg-live-insights-surface text-live-insights-muted"
                  }`}
                >
                  {state === "active" ? (
                    <EmberGlyph size={16} animated />
                  ) : (
                    <span className="material-symbols-outlined text-base leading-none">
                      {state === "done" ? "check" : "more_horiz"}
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    state === "done"
                      ? "text-live-insights-foreground"
                      : state === "active"
                      ? "text-live-insights-foreground font-medium"
                      : "text-live-insights-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-live-insights-border px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-live-insights-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-interview-brand animate-pulse" />
            Streaming to Live Insights rail
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-live-insights-border px-3 py-1.5 text-xs text-live-insights-muted hover:text-live-insights-foreground transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
          >
            Run in background
          </button>
        </div>
      </div>
    </div>
  );
}

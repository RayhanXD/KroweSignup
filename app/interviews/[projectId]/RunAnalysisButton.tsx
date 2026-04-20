"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
  interviewCount: number;
  projectStatus: string;
  onAnalysisStart?: () => void;
};

export function RunAnalysisButton({
  projectId,
  interviewCount,
  projectStatus,
  onAnalysisStart,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(projectStatus);
  const [loading, setLoading] = useState(false);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/interviews/project/${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      const newStatus = data.project?.status;
      if (newStatus) setStatus(newStatus);
      if (newStatus === "ready") {
        router.push(`/interviews/${projectId}/decision`);
      } else if (newStatus === "failed") {
        router.refresh();
      }
    } catch {
      // ignore
    }
  }, [projectId, router]);

  useEffect(() => {
    if (status !== "processing") return;
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [status, poll]);

  async function triggerAnalysis(force = false) {
    setError(null);
    if (force) setRerunLoading(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/interviews/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start analysis.");
        return;
      }
      if (data.status === "processing") {
        setStatus("processing");
        onAnalysisStart?.();
      }
    } catch {
      setError("Network error while starting analysis.");
    } finally {
      setLoading(false);
      setRerunLoading(false);
    }
  }

  if (status === "processing") {
    return (
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-full bg-warning-soft text-warning border border-warning/40 text-xs font-semibold flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
          Analyzing...
        </span>
        <button
          onClick={() => triggerAnalysis(true)}
          disabled={rerunLoading}
          className="px-3 py-1.5 rounded-full border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
          title="Stop current analysis and rerun from scratch"
        >
          {rerunLoading ? "Restarting..." : "↺ Rerun"}
        </button>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => triggerAnalysis(true)}
          disabled={rerunLoading || interviewCount < 3}
          className="px-3 py-1.5 rounded-full border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
          title="Rerun analysis with all interviews"
        >
          {rerunLoading ? "Restarting..." : "↺ Rerun Analysis"}
        </button>
        {error && <p className="text-[10px] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => triggerAnalysis(false)}
        disabled={interviewCount < 3 || loading}
        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-interview-brand to-primary-hover text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
      >
        {loading ? "Starting..." : "Run Analysis"}
      </button>
      {error && <p className="text-[10px] text-danger">{error}</p>}
    </div>
  );
}

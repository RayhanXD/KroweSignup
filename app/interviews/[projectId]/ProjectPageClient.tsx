"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunAnalysisButton } from "./RunAnalysisButton";
import { GranolaDrawer, type GranolaInboxItem, type AssignedGranolaItem } from "./GranolaDrawer";
import { AnalysisModal } from "./AnalysisModal";
import InterviewsSidebar from "../_components/InterviewsSidebar";
import type { FeatureSpec, ProblemCluster, DecisionOutput } from "@/lib/interviews/types";
import { toLiveInsightsClusterTitle } from "@/lib/interviews/liveInsightsTitle";
import type { InterviewSignalLabel, InterviewSignalMetrics } from "@/lib/interviews/interviewSignal";
import type { AnalysisResponse } from "@/lib/analysis/hypothesisVsReality";
import type { ActivityEntry } from "@/lib/interviews/activityStream";

type Interview = {
  id: string;
  status: "pending" | "structured" | "failed";
  created_at: string;
  interviewee_name: string | null;
  interviewee_context: string | null;
  tags: string[] | null;
  high_signal: boolean;
  signal_label: InterviewSignalLabel;
  signal_metrics: InterviewSignalMetrics;
  source: "granola" | "manual";
  top_problem: { problem_text: string | null; quote: string | null } | null;
};

type Project = {
  id: string;
  name: string;
  status: "collecting" | "processing" | "ready" | "failed";
  interview_count: number;
  created_at: string;
  updated_at: string;
  session_id: string | null;
  onboarding_mode: "manual" | "webscraper" | null;
  onboarding_completed_at: string | null;
};

type ClusterWithId = ProblemCluster & { id: string };
type DecisionWithId = Omit<DecisionOutput, "project_id"> & {
  id: string;
  updated_at: string;
};
type AnalysisDecision = AnalysisResponse["decision"];

type Props = {
  project: Project;
  interviews: Interview[];
  projectId: string;
  latestDecision: DecisionWithId | null;
  latestDecisionVerdict: AnalysisDecision | null;
  topCluster: ClusterWithId | null;
  allClusters: ClusterWithId[];
  decisionFeatures: FeatureSpec[];
  granolaItems: GranolaInboxItem[];
  granolaAssignedItems: AssignedGranolaItem[];
  granolaCount: number;
  granolaConnectionActive: boolean;
  granolaLastSyncAt: string | null;
  activityStream: ActivityEntry[];
  liveSignalsToday: number;
};

function formatTimeAgo(iso?: string) {
  if (!iso) return "No analysis yet";
  const ms = Date.now() - new Date(iso).getTime();
  const minute = 60_000, hour = 60 * minute, day = 24 * hour;
  if (ms < minute) return "just now";
  if (ms < hour) return `${Math.floor(ms / minute)}m ago`;
  if (ms < day) return `${Math.floor(ms / hour)}h ago`;
  return `${Math.floor(ms / day)}d ago`;
}

function initialForName(name: string | null, fallbackIndex: number) {
  if (!name) return `#${fallbackIndex + 1}`;
  return name.trim().charAt(0).toUpperCase() || `#${fallbackIndex + 1}`;
}

function signalBarClass(label: InterviewSignalLabel) {
  if (label === "High") return "bg-interview-brand";
  if (label === "Medium") return "bg-warning";
  return "bg-danger";
}

function signalPillClass(label: InterviewSignalLabel) {
  if (label === "High") return "bg-primary-soft text-interview-brand";
  if (label === "Medium") return "bg-warning-soft text-warning";
  return "bg-danger-soft text-danger";
}

function deriveDecisionLabel(status?: DecisionOutput["status"]) {
  if (status === "ready") return "Proceed";
  if (status === "processing") return "Processing";
  if (status === "insufficient_data") return "Insufficient Data";
  if (status === "failed") return "Failed";
  return "Not Run";
}

function deriveVerdictLabel(verdict: AnalysisDecision | null, status?: DecisionOutput["status"]) {
  if (verdict === "proceed") return "Proceed";
  if (verdict === "refine") return "Refine";
  if (verdict === "pivot") return "Pivot";
  if (verdict === "rethink") return "Rethink";
  return deriveDecisionLabel(status);
}

function deriveVerdictClass(verdict: AnalysisDecision | null) {
  if (verdict === "proceed") return "text-success";
  if (verdict === "pivot") return "text-danger";
  if (verdict === "refine") return "text-warning";
  return "text-foreground";
}

function renderTaggedText(text: string) {
  const parts = text.split(/(<b>.*?<\/b>)/g);
  return parts.map((part, i) => {
    if (part.startsWith("<b>") && part.endsWith("</b>")) {
      return (
        <strong key={i} className="font-semibold text-live-insights-foreground">
          {part.slice(3, -4)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function ConfRing({ pct }: { pct: number }) {
  const r = 32;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke="url(#conf-grad)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
        <defs>
          <linearGradient id="conf-grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--interview-brand)" />
            <stop offset="1" stopColor="var(--interview-brand-end)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-[18px] font-bold text-foreground">{pct}%</span>
        <span className="text-[10px] font-medium text-muted-foreground">Conf</span>
      </div>
    </div>
  );
}

export function ProjectPageClient({
  project,
  interviews,
  projectId,
  latestDecision,
  latestDecisionVerdict,
  topCluster,
  allClusters,
  decisionFeatures,
  granolaItems,
  granolaAssignedItems,
  granolaCount,
  granolaConnectionActive,
  granolaLastSyncAt,
  activityStream,
  liveSignalsToday,
}: Props) {
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(project.status === "processing");

  const [sourceFilter, setSourceFilter] = useState<"all" | "granola" | "manual" | "live">("all");
  const [signalFilter, setSignalFilter] = useState<InterviewSignalLabel | null>(null);

  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rawConf = Math.round((latestDecision?.confidence_score ?? 0) * 100);
  const [animatedConf, setAnimatedConf] = useState(0);
  useEffect(() => {
    let c = 0;
    const target = rawConf;
    const iv = setInterval(() => {
      c = Math.min(c + 3, target);
      setAnimatedConf(c);
      if (c >= target) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [rawConf]);

  const previewRequestedRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Kick off preview POST once, then poll router.refresh() every 5s (max 90s)
  // until problem_clusters rows appear. 18s was too short for the pipeline.
  useEffect(() => {
    if (allClusters.length > 0) return;
    if (interviews.length === 0) return;
    if (previewRequestedRef.current) return;
    previewRequestedRef.current = true;

    fetch("/api/interviews/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    }).catch(() => {});

    let attempts = 0;
    const MAX_ATTEMPTS = 18; // 18 * 5s = 90s cap
    pollIntervalRef.current = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= MAX_ATTEMPTS && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 5_000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop polling as soon as clusters land.
  useEffect(() => {
    if (allClusters.length > 0 && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, [allClusters.length]);

  const counts = useMemo(() => ({
    all: interviews.length,
    granola: interviews.filter((i) => i.source === "granola").length,
    manual: interviews.filter((i) => i.source === "manual").length,
    live: 0,
  }), [interviews]);

  const filtered = useMemo(() => {
    return interviews.filter((iv) => {
      if (sourceFilter !== "all" && iv.source !== sourceFilter) return false;
      if (signalFilter && iv.signal_label !== signalFilter) return false;
      return true;
    });
  }, [interviews, sourceFilter, signalFilter]);

  const rankedClusters = useMemo(() => allClusters.slice(0, 6), [allClusters]);
  const suggestedFeatures = useMemo(() => decisionFeatures.slice(0, 3), [decisionFeatures]);
  const topQuotes = topCluster?.supporting_quotes ?? [];
  const verdictLabel = deriveVerdictLabel(latestDecisionVerdict, latestDecision?.status);
  const verdictClass = deriveVerdictClass(latestDecisionVerdict);

  async function handleDeleteInterview(interviewId: string) {
    setDeleteError(null);
    setDeleteLoadingId(interviewId);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete interview.");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete interview.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border border-border/60 bg-card shadow-soft min-h-screen">
        <div className="grid min-h-screen md:grid-cols-[240px_1fr]">

          <InterviewsSidebar activeNav="interviews" projectId={projectId} granolaCount={granolaCount} interviewCount={interviews.length} />

          <section className="flex min-h-screen flex-col">

            {/* Topbar */}
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sticky top-0 bg-card z-10">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="hover:text-foreground">Krowe</span>
                <span className="text-border">/</span>
                <span className="font-medium text-foreground">Interviews</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="hidden sm:flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground opacity-50 cursor-not-allowed"
                  title="Coming soon"
                >
                  <span className="material-symbols-outlined text-[14px]">search</span>
                  <span className="hidden md:block">Search interviews…</span>
                  <span className="rounded bg-muted px-1 font-mono text-[10px] hidden md:block">⌘K</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">cloud_sync</span>
                  Granola
                  {granolaCount > 0 && (
                    <span className="rounded-full bg-interview-brand-tint px-1.5 py-0.5 text-[10px] font-bold text-interview-brand">
                      {granolaCount}
                    </span>
                  )}
                </button>
                <Link
                  href={`/interviews/${projectId}/add`}
                  className="flex items-center gap-1 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span className="hidden sm:block">Add interview</span>
                </Link>
                <RunAnalysisButton
                  projectId={projectId}
                  interviewCount={project.interview_count}
                  projectStatus={project.status}
                  onAnalysisStart={() => {
                    setIsProcessing(true);
                    setAnalysisModalOpen(true);
                  }}
                />
              </div>
            </div>

            {/* Hero */}
            <div className="border-b border-border/60 bg-gradient-to-b from-interview-brand-tint/20 to-transparent px-5 py-6 sm:px-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <span className="material-symbols-outlined text-[13px] text-interview-brand">forum</span>
                    Interviews
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-foreground">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${project.status === "processing" ? "bg-warning animate-pulse" : project.status === "ready" ? "bg-success" : "bg-muted-foreground"}`} />
                      {project.status === "processing" ? "Analyzing" : project.status === "ready" ? "Ready" : "Collecting"}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                    Your customer signal, in one place.
                  </h1>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
                    Uncovering pain, validating signal, and building conviction — one interview at a time.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">groups</span>
                      <strong className="text-foreground">{interviews.length}</strong> interviews
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">flag</span>
                      target <strong className="text-foreground">12</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">bolt</span>
                      <strong className="text-foreground">{liveSignalsToday}</strong> new today
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      last analysis <strong className="text-foreground">{formatTimeAgo(latestDecision?.updated_at)}</strong>
                    </div>
                  </div>
                </div>
                {/* Verdict card */}
                <div className="w-full xl:w-72 shrink-0">
                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                    <div className="flex items-center gap-4 mb-3">
                      <ConfRing pct={animatedConf} />
                      <div className="flex-1">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verdict</p>
                          <p className={`text-sm font-bold ${verdictClass}`}>{verdictLabel}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-[10px] text-muted-foreground">
                      <span>Analyzed {formatTimeAgo(latestDecision?.updated_at)}</span>
                      <span className="flex items-center gap-1 text-interview-brand font-semibold">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-interview-brand animate-pulse" />
                        Live
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col xl:grid xl:grid-cols-[1fr_300px]">

              {/* Interview list */}
              <div className="border-r border-border/60 p-4 sm:p-5">

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    Interviews{" "}
                    <span className="ml-1 font-normal text-muted-foreground">
                      {filtered.length} of {interviews.length}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDrawerOpen(true)}
                      className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">cloud_sync</span>
                      {granolaCount > 0 ? `${granolaCount} new in Granola` : "Granola"}
                    </button>
                    <button
                      disabled
                      title="Coming soon"
                      className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[13px]">mic</span>
                      Start live
                    </button>
                    <button
                      disabled
                      title="Coming soon"
                      className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[13px]">upload_file</span>
                      Upload
                    </button>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-[11px]">
                    {(["all", "granola", "manual", "live"] as const).map((k) => {
                      const labels = { all: "All", granola: "Granola", manual: "Manual", live: "Live" };
                      const c = k === "all" ? counts.all : k === "granola" ? counts.granola : k === "manual" ? counts.manual : counts.live;
                      return (
                        <button
                          key={k}
                          onClick={() => setSourceFilter(k)}
                          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                            sourceFilter === k
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {labels[k]} <span className="ml-0.5 opacity-60">{c}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="h-4 w-px bg-border/60" />
                  {(["High", "Medium", "Low"] as InterviewSignalLabel[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSignalFilter(signalFilter === s ? null : s)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        signalFilter === s
                          ? "border-interview-brand/50 bg-interview-brand-tint text-interview-brand"
                          : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">sensors</span>
                      {s} signal
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="material-symbols-outlined text-[13px]">sort</span>
                    Recent first
                    <span className="material-symbols-outlined text-[12px]">expand_more</span>
                  </div>
                </div>

                {deleteError && (
                  <div className="mb-4 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
                    {deleteError}
                  </div>
                )}

                <div className="space-y-3">
                  {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
                      <span className="material-symbols-outlined text-2xl mb-2 block text-muted-foreground/50">filter_alt_off</span>
                      No interviews match this filter.
                      <button
                        onClick={() => { setSourceFilter("all"); setSignalFilter(null); }}
                        className="mt-2 block mx-auto text-xs text-interview-brand hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    filtered.map((interview, i) => {
                      const topProblem = interview.top_problem;
                      const isPending = interview.status === "pending";
                      const problemSnippet =
                        topProblem?.problem_text ??
                        (isPending ? "Processing…" : "No key problem extracted yet.");
                      const quote =
                        topProblem?.quote ??
                        (isPending ? "Processing…" : "No direct quote extracted yet.");
                      const tags = interview.tags ?? [];

                      return (
                        <div
                          key={interview.id}
                          className="group relative rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${signalBarClass(interview.signal_label)}`} />

                          <div className="pl-5 pr-4 pt-4 pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                                  {initialForName(interview.interviewee_name, i)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm font-semibold text-foreground truncate">
                                      {interview.interviewee_name ?? `Interview #${i + 1}`}
                                    </h3>
                                    {interview.source === "granola" && (
                                      <span className="rounded-full bg-interview-brand-tint px-1.5 py-0.5 text-[10px] font-bold text-interview-brand">
                                        Granola
                                      </span>
                                    )}
                                    {interview.source === "manual" && (
                                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                        Manual
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {interview.interviewee_context ?? "No context provided"}
                                    <span className="mx-1.5 text-border">·</span>
                                    {formatTimeAgo(interview.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${signalPillClass(interview.signal_label)}`}>
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                                  {interview.signal_label} signal
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (deleteLoadingId) return;
                                    const confirmed = window.confirm("Delete this interview? This cannot be undone.");
                                    if (!confirmed) return;
                                    void handleDeleteInterview(interview.id);
                                  }}
                                  disabled={deleteLoadingId === interview.id}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-danger/40 text-danger hover:bg-danger-soft opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Delete interview"
                                >
                                  <span className="material-symbols-outlined text-[14px] leading-none">
                                    {deleteLoadingId === interview.id ? "hourglass_top" : "delete"}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 px-5 pt-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                <span className="material-symbols-outlined text-[12px]">error</span>
                                Key problem
                              </div>
                              <p className="text-xs text-foreground leading-relaxed">{problemSnippet}</p>
                            </div>
                            <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                <span className="material-symbols-outlined text-[12px]">format_quote</span>
                                Direct quote
                              </div>
                              <p className="text-xs italic text-muted-foreground leading-relaxed">
                                &ldquo;{quote}&rdquo;
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 px-5 py-2.5 mt-1 border-t border-border/40">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                              {tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Link
                                href={`/interviews/${projectId}/${interview.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[11px]">north_east</span>
                                Open
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Empty add CTA */}
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center">
                    <span className="material-symbols-outlined text-2xl text-muted-foreground/50 mb-2 block">add_circle</span>
                    <p className="text-sm text-muted-foreground mb-3">Add more interviews to strengthen the signal</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => setDrawerOpen(true)}
                        className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background transition-colors"
                      >
                        <span className="material-symbols-outlined text-[13px]">cloud_sync</span>
                        Import from Granola
                      </button>
                      <button disabled title="Coming soon" className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed">
                        <span className="material-symbols-outlined text-[13px]">mic</span>
                        Record live
                      </button>
                      <button disabled title="Coming soon" className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed">
                        <span className="material-symbols-outlined text-[13px]">upload_file</span>
                        Upload transcript
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Insights Rail */}
              <div className="bg-live-insights-bg p-4 sm:p-5 space-y-5 rounded-xl self-start">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-live-insights-foreground">
                      <span className="material-symbols-outlined text-[14px] text-interview-brand">auto_awesome</span>
                      Live insights
                    </h2>
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-interview-brand">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-interview-brand animate-pulse" />
                      Streaming
                    </span>
                  </div>
                  <p className="text-[11px] text-live-insights-muted leading-relaxed">
                    Krowe listens as interviews come in and re-synthesizes clusters on each new quote.
                  </p>
                </div>

                {/* Confidence meter */}
                <div className="rounded-xl border border-live-insights-border bg-live-insights-surface p-3.5">
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-live-insights-muted">Confidence</span>
                    <span className="text-xl font-bold text-interview-brand">{animatedConf}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-live-insights-track">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-interview-brand to-interview-brand-end transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, animatedConf))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[10px] text-live-insights-muted">
                    {interviews.length} interviews
                  </div>
                </div>

                {/* Suggested features */}
                <div>
                  <span className="mb-2.5 block text-[10px] font-bold uppercase tracking-widest text-live-insights-muted">
                    Suggested features
                  </span>
                  <ul className="space-y-2.5">
                    {suggestedFeatures.length > 0 ? (
                      suggestedFeatures.map((feature, idx) => (
                        <li key={`${feature.name}-${idx}`} className="flex items-start gap-2 text-[11px]">
                          <span className="mt-0.5 text-interview-brand shrink-0">•</span>
                          <div>
                            <div className="text-live-insights-foreground font-medium">{feature.name}</div>
                            {feature.description && (
                              <div className="text-live-insights-muted text-[10px] leading-relaxed mt-0.5">
                                {feature.description}
                              </div>
                            )}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-[11px] text-live-insights-muted">No suggested features yet.</li>
                    )}
                  </ul>
                </div>

                {/* Activity stream */}
                {activityStream.length > 0 && (
                  <div>
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-live-insights-muted">
                        Activity stream
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-interview-brand/15 px-1.5 py-0.5 text-[9px] font-bold text-interview-brand">
                        <span className="inline-block h-1 w-1 rounded-full bg-interview-brand animate-pulse" />
                        live
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {activityStream.map((entry, i) => (
                        <div key={i} className="flex gap-2 text-[11px]">
                          <span className="shrink-0 font-mono text-[10px] text-live-insights-muted w-10">{entry.ts}</span>
                          <div className="min-w-0">
                            <span
                              className={`mr-1.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                                entry.tag === "clu"
                                  ? "bg-interview-brand/20 text-interview-brand"
                                  : entry.tag === "qte"
                                  ? "bg-tertiary/15 text-tertiary"
                                  : "bg-live-insights-surface text-live-insights-muted"
                              }`}
                            >
                              {entry.tag === "clu" ? "cluster" : entry.tag === "qte" ? "quote" : "pattern"}
                            </span>
                            <span className="text-live-insights-muted">
                              {renderTaggedText(entry.text)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <GranolaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        items={granolaItems}
        assignedItems={granolaAssignedItems}
        connectionActive={granolaConnectionActive}
        lastSyncAt={granolaLastSyncAt}
      />

      <AnalysisModal
        open={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        isProcessing={isProcessing}
      />
    </div>
  );
}

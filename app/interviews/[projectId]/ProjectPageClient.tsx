"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { RunAnalysisButton } from "./RunAnalysisButton";
import { InterviewScriptTab } from "./InterviewScriptTab";
import { BusinessProfileTab } from "./BusinessProfileTab";
import type { FeatureSpec, ProblemCluster, DecisionOutput } from "@/lib/interviews/types";
import { toLiveInsightsClusterTitle } from "@/lib/interviews/liveInsightsTitle";
import type { InterviewSignalLabel, InterviewSignalMetrics } from "@/lib/interviews/interviewSignal";
import type { AnalysisResponse } from "@/lib/analysis/hypothesisVsReality";

type Interview = {
  id: string;
  status: "pending" | "structured" | "failed";
  created_at: string;
  interviewee_name: string | null;
  interviewee_context: string | null;
  high_signal: boolean;
  signal_label: InterviewSignalLabel;
  signal_metrics: InterviewSignalMetrics;
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    collecting: "bg-primary-soft text-primary border border-primary/35",
    processing:  "bg-warning-soft text-warning border border-warning/40",
    ready:       "bg-success-soft text-success border border-success/40",
    failed:      "bg-danger-soft text-danger border border-danger/40",
    pending:     "bg-muted text-muted-foreground border border-border",
    structured:  "bg-success-soft text-success border border-success/40",
  };
  const dots: Record<string, string> = {
    collecting: "bg-primary animate-pulse",
    processing: "bg-warning animate-pulse",
    ready:      "bg-success",
  };
  const labels: Record<string, string> = {
    collecting: "Collecting",
    processing: "Processing",
    ready:      "Ready",
    failed:     "Failed",
    pending:    "Pending",
    structured: "Structured",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
        styles[status] ?? "bg-muted text-muted-foreground border border-border"
      }`}
    >
      {dots[status] && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      )}
      {labels[status] ?? status}
    </span>
  );
}

type Tab = "interviews" | "script" | "businessProfile";

type Props = {
  project: Project;
  interviews: Interview[];
  projectId: string;
  latestDecision: DecisionWithId | null;
  latestDecisionVerdict: AnalysisDecision | null;
  topCluster: ClusterWithId | null;
  allClusters: ClusterWithId[];
  decisionFeatures: FeatureSpec[];
};

function formatTimeAgo(iso?: string) {
  if (!iso) return "No analysis yet";
  const ms = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (ms < minute) return "just now";
  if (ms < hour) return `${Math.floor(ms / minute)}m ago`;
  if (ms < day) return `${Math.floor(ms / hour)}h ago`;
  return `${Math.floor(ms / day)}d ago`;
}

function initialForName(name: string | null, fallbackIndex: number) {
  if (!name) return `#${fallbackIndex + 1}`;
  return name.trim().charAt(0).toUpperCase() || `#${fallbackIndex + 1}`;
}

function signalBadgeClasses(label: InterviewSignalLabel) {
  if (label === "High") return "bg-primary-soft text-interview-brand";
  if (label === "Medium") return "bg-muted text-muted-foreground";
  return "bg-danger-soft text-danger";
}

function deriveDecisionLabel(status?: DecisionOutput["status"]) {
  if (status === "ready") return "Ready";
  if (status === "processing") return "Processing";
  if (status === "insufficient_data") return "Insufficient Data";
  if (status === "failed") return "Failed";
  return "Not Run";
}

function deriveVerdictLabel(
  verdict: AnalysisDecision | null,
  status?: DecisionOutput["status"]
) {
  if (verdict === "proceed") return "Proceed";
  if (verdict === "refine") return "Refine";
  if (verdict === "pivot") return "Pivot";
  if (verdict === "rethink") return "Rethink";
  return deriveDecisionLabel(status);
}

function deriveVerdictClassName(verdict: AnalysisDecision | null): string {
  if (verdict === "proceed") return "text-success";
  if (verdict === "pivot") return "text-danger";
  if (verdict === "refine") return "text-warning";
  return "text-foreground";
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
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("interviews");
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const confidencePct = Math.round((latestDecision?.confidence_score ?? 0) * 100);
  const rankedClusters = useMemo(() => allClusters.slice(0, 3), [allClusters]);
  const suggestedFeatures = useMemo(() => decisionFeatures.slice(0, 2), [decisionFeatures]);
  const decisionLabel = deriveDecisionLabel(latestDecision?.status);
  const verdictLabel = deriveVerdictLabel(latestDecisionVerdict, latestDecision?.status);
  const verdictClassName = deriveVerdictClassName(latestDecisionVerdict);
  const topQuotes = topCluster?.supporting_quotes ?? [];

  async function handleDeleteInterview(interviewId: string) {
    setDeleteError(null);
    setDeleteLoadingId(interviewId);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete interview.");
      }
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete interview.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
        <aside className="border-r border-border/60 bg-[color-mix(in_srgb,var(--surface-subtle)_75%,white)] p-3">
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 py-2">
            <Image src="/KroweIcon.png" alt="Krowe icon" width={22} height={22} className="h-[22px] w-[22px] rounded-sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">Krowe</p>
              <p className="truncate text-[10px] text-muted-foreground">Project workspace</p>
            </div>
          </div>
          <nav aria-label="Workspace nav" className="space-y-1.5">
            <Link href="/interviews" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
              <span className="material-symbols-outlined text-base" aria-hidden>home</span>
              Home
            </Link>
            <Link href="/interviews/projects" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
              <span className="material-symbols-outlined text-base" aria-hidden>folder_open</span>
              Projects
            </Link>
            <div className="flex items-center gap-2 rounded-lg bg-interview-brand-tint/70 px-2.5 py-2 text-sm font-medium text-interview-brand">
              <span className="material-symbols-outlined text-base" aria-hidden>workspaces</span>
              Active Workspace
            </div>
            <Link href={`/interviews/${projectId}/add`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
              <span className="material-symbols-outlined text-base" aria-hidden>add_circle</span>
              Add Interview
            </Link>
          </nav>
        </aside>

        <section className="p-3 sm:p-4">
          <header className="mb-3 flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Image src="/KroweIcon.png" alt="Krowe" width={18} height={18} className="h-[18px] w-[18px] rounded-sm" />
              <h1 className="text-sm font-medium text-foreground">Workspace Console</h1>
            </div>
            <div className="text-xs text-muted-foreground">
              <Link href="/interviews" className="hover:underline">All projects</Link>
            </div>
          </header>

          <div className="mb-5 rounded-2xl border border-border/60 bg-card p-5 shadow-soft sm:p-6">
            <div className="mb-1 min-w-0">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Project
              </p>
              <div className="flex flex-wrap items-center gap-3 gap-y-2">
                <h2 className="serif-text text-[24px] font-bold leading-[1.15] tracking-tight text-foreground sm:text-[26px]">
                  {project.name}
                </h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Strategic intelligence and synthesis for this workspace. Switch tabs to review transcripts
                or your interview script.
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-muted-foreground">groups</span>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{project.interview_count}</span>
                  {" "}interview{project.interview_count !== 1 ? "s" : ""} collected
                  {project.interview_count < 3 && (
                    <span className="ml-1 text-[11px] text-muted-foreground">
                      · {3 - project.interview_count} more to enable analysis
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-2 border-b border-border/60 bg-card">
          <div className="flex gap-0">
            {(["interviews", "script", "businessProfile"] as Tab[]).map((tab) => {
              const labels: Record<Tab, string> = {
                interviews: "Interviews",
                script: "Interview Script",
                businessProfile: "Business Profile",
              };
              const icons: Record<Tab, string> = {
                interviews: "chat_bubble_outline",
                script: "description",
                businessProfile: "apartment",
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-interview-brand text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[15px] leading-none ${activeTab === tab ? "text-interview-brand" : ""}`}>
                    {icons[tab]}
                  </span>
                  {labels[tab]}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex flex-col items-end gap-1 py-2">
            {project.status === "ready" ? (
              <Link
                href={`/interviews/${projectId}/decision`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-interview-brand to-interview-brand-end text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px] leading-none">insights</span>
                View Decision
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 text-xs font-medium text-muted-foreground bg-muted/40 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px] leading-none opacity-50">lock</span>
                View Decision
              </button>
            )}
            {project.status === "processing" ? (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                Analysis in progress…
              </p>
            ) : project.status !== "ready" ? (
              <p className="text-[10px] text-muted-foreground">Run analysis to unlock</p>
            ) : null}
          </div>
          </div>

          {/* Interviews tab — constrained */}
          {activeTab === "interviews" && (
            <main className="mt-8 space-y-8 pb-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="serif-text text-lg sm:text-xl font-bold text-foreground tracking-tight">
              Interviews
            </h2>
            <div className="flex items-center gap-3">
              <RunAnalysisButton
                projectId={projectId}
                interviewCount={project.interview_count}
                projectStatus={project.status}
              />
              <Link
                href={`/interviews/${projectId}/add`}
                className="px-3 py-1.5 rounded-full border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
              >
                + Add Interview
              </Link>
            </div>
          </div>

          <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft flex flex-wrap items-center justify-between gap-5">
            <div className="flex flex-wrap items-center gap-6 md:gap-10">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest">
                  Decision
                </span>
                <span className="text-base font-bold text-interview-brand">{decisionLabel}</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest">
                  Confidence
                </span>
                <span className="text-base font-bold">{confidencePct}%</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest">
                  Verdict
                </span>
                <span className={`text-base font-bold ${verdictClassName}`}>{verdictLabel}</span>
              </div>
            </div>
            <div className="hidden lg:block text-right">
              <p className="text-xs text-muted-foreground font-medium italic">
                Last analysis run {formatTimeAgo(latestDecision?.updated_at)}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
            <div className="md:col-span-7 space-y-5">
              {deleteError && (
                <div className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
                  {deleteError}
                </div>
              )}
              {interviews.length === 0 ? (
                <div className="border border-border/60 rounded-2xl p-8 text-center text-muted-foreground bg-card shadow-soft">
                  <p className="text-sm">No interviews yet. Add at least 3 to run analysis.</p>
                </div>
              ) : (
                interviews.map((interview, i) => {
                  const signalLabel = interview.signal_label;
                  const signalClass = signalBadgeClasses(signalLabel);
                  const quote =
                    topQuotes[i]?.verbatim_text ??
                    topQuotes[i]?.text ??
                    "No direct quote linked yet for this interview.";
                  const problemSnippet =
                    topCluster?.canonical_problem ?? "No clustered pain identified yet.";
                  return (
                    <Link
                      key={interview.id}
                      href={`/interviews/${projectId}/${interview.id}`}
                      className="block rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="flex space-x-4 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                            {initialForName(interview.interviewee_name, i)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold text-foreground">
                              {interview.interviewee_name ?? `Interview #${i + 1}`}
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium truncate">
                              {interview.interviewee_context ?? "No interview context provided"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`${signalClass} rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}
                          >
                            {signalLabel} Signal
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
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-danger/40 text-danger hover:bg-danger-soft disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Delete interview"
                            title="Delete interview"
                          >
                            <span className="material-symbols-outlined text-[16px] leading-none">
                              {deleteLoadingId === interview.id ? "hourglass_top" : "delete"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          Context:{" "}
                          {interview.interviewee_context ??
                            "Interview details available in the full transcript."}
                        </p>
                        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                          <div className="rounded-xl border border-border/50 bg-muted/35 p-4">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">
                              Key Problems
                            </span>
                            <ul className="space-y-2">
                              <li className="flex items-start text-xs text-foreground">
                                <span className="text-interview-brand mr-2">•</span> {problemSnippet}
                              </li>
                            </ul>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-muted/35 p-4">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">
                              Direct Quote
                            </span>
                            <p className="text-xs italic text-muted-foreground leading-relaxed">
                              &ldquo;{quote}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="md:col-span-3 space-y-5 self-start">
              <div className="rounded-2xl border border-live-insights-border bg-live-insights-bg p-5 text-live-insights-foreground shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="serif-text text-base font-bold text-live-insights-foreground">Live Insights</h2>
                  <span className="flex h-2 w-2 rounded-full bg-interview-brand animate-pulse" />
                </div>
                <div className="space-y-6">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-live-insights-muted tracking-widest block mb-4">
                      Problem Clusters
                    </span>
                    <div className="space-y-3">
                      {rankedClusters.length > 0 ? (
                        rankedClusters.map((cluster, idx) => {
                          const bar = Math.min(100, Math.round(cluster.score * 100));
                          const active = idx === 0;
                          return (
                            <div key={cluster.id} className="flex items-center justify-between gap-3">
                              <div className="flex items-center min-w-0">
                                <span
                                  className={`w-5 text-[10px] font-bold ${active ? "text-interview-brand" : "text-live-insights-muted"}`}
                                >
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                <span
                                  className={`text-xs truncate ${active ? "text-live-insights-foreground" : "text-live-insights-muted"}`}
                                  title={cluster.canonical_problem}
                                >
                                  {toLiveInsightsClusterTitle(cluster.canonical_problem)}
                                </span>
                              </div>
                              <div className="w-12 h-1 rounded-full overflow-hidden shrink-0 bg-live-insights-track">
                                <div
                                  className={`${active ? "bg-interview-brand" : "bg-live-insights-bar-inactive"} h-full`}
                                  style={{ width: `${bar}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-live-insights-muted">No clusters available yet.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase font-bold text-live-insights-muted tracking-widest block mb-4">
                      Emerging Patterns
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(rankedClusters.map((c) => c.category).filter(Boolean).slice(0, 3) as string[]).map(
                        (pattern, idx) => (
                          <span
                            key={`${pattern}-${idx}`}
                            className={`text-[10px] px-2 py-1 rounded-md border ${
                              idx === 0
                                ? "border-interview-brand/35 bg-interview-brand/20 text-interview-brand"
                                : "border-live-insights-border bg-live-insights-surface text-live-insights-muted"
                            }`}
                          >
                            {pattern}
                          </span>
                        )
                      )}
                      {rankedClusters.length === 0 && (
                        <span className="text-[10px] text-live-insights-muted">No patterns yet</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-live-insights-border bg-live-insights-surface p-3.5">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[11px] uppercase font-bold tracking-wide text-live-insights-muted">
                        Confidence
                      </span>
                      <span className="text-xl font-bold text-interview-brand">{confidencePct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-live-insights-track">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-interview-brand"
                        style={{ width: `${Math.min(100, Math.max(0, confidencePct))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase font-bold text-live-insights-muted tracking-widest block mb-4">
                      Suggested Features
                    </span>
                    <ul className="space-y-3">
                      {suggestedFeatures.length > 0 ? (
                        suggestedFeatures.map((feature, idx) => (
                          <li
                            key={`${feature.name}-${idx}`}
                            className="flex items-start text-xs text-live-insights-foreground"
                          >
                            <span className="mr-2 text-interview-brand">•</span>
                            {feature.name}
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-live-insights-muted">No suggested features yet.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

            </main>
          )}

          {/* Script tab — full width */}
          {activeTab === "script" && (
            <div className="mt-6 flex min-h-0 flex-1 flex-col">
              <InterviewScriptTab projectId={projectId} projectName={project.name} />
            </div>
          )}

          {activeTab === "businessProfile" && (
            <div className="mt-6">
              <BusinessProfileTab projectId={projectId} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

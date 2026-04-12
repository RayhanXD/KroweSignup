"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunAnalysisButton } from "./RunAnalysisButton";
import { InterviewScriptTab } from "./InterviewScriptTab";
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
};

type ClusterWithId = ProblemCluster & { id: string };
type DecisionWithId = Omit<DecisionOutput, "project_id"> & {
  id: string;
  updated_at: string;
};
type AnalysisDecision = AnalysisResponse["decision"];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    collecting: "bg-blue-50 text-blue-700 border border-blue-200",
    processing:  "bg-yellow-50 text-yellow-700 border border-yellow-200",
    ready:       "bg-green-50 text-green-700 border border-green-200",
    failed:      "bg-red-50 text-red-700 border border-red-200",
    pending:     "bg-gray-50 text-gray-500 border border-gray-200",
    structured:  "bg-green-50 text-green-700 border border-green-200",
  };
  const dots: Record<string, string> = {
    collecting: "bg-blue-500 animate-pulse",
    processing: "bg-yellow-500 animate-pulse",
    ready:      "bg-green-500",
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
        styles[status] ?? "bg-gray-50 text-gray-500 border border-gray-200"
      }`}
    >
      {dots[status] && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      )}
      {labels[status] ?? status}
    </span>
  );
}

type Tab = "interviews" | "script";

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
  if (label === "High") return "bg-[#FFEAE5] text-[#FF6A4D]";
  if (label === "Medium") return "bg-gray-100 text-gray-600";
  return "bg-red-50 text-red-600";
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
  if (verdict === "proceed") return "text-green-600";
  if (verdict === "pivot") return "text-red-600";
  if (verdict === "refine") return "text-yellow-600";
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Constrained header section */}
      <div className="max-w-[1240px] mx-auto w-full px-4 md:px-5 pt-12 pb-0">
        <div className="max-w-3xl">
          {/* Back link */}
          <div className="mb-6">
            <Link href="/interviews" className="text-xs text-muted-foreground hover:underline">
              ← All projects
            </Link>
          </div>

          {/* Project header */}
          <div className="flex items-start gap-3 mb-7">
            <div className="mb-1">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-0.5">
                Project
              </p>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight leading-tight">{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex items-center gap-1.5 mt-1">
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
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-2 border-b border-border">
          <div className="flex gap-0">
            {(["interviews", "script"] as Tab[]).map((tab) => {
              const labels: Record<Tab, string> = {
                interviews: "Interviews",
                script: "Interview Script",
              };
              const icons: Record<Tab, string> = {
                interviews: "chat_bubble_outline",
                script: "description",
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-[#FF6A4D] text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[15px] leading-none ${activeTab === tab ? "text-[#FF6A4D]" : ""}`}>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#ff6a4d] to-[#ff874d] text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px] leading-none">insights</span>
                View Decision
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground bg-muted/40 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px] leading-none opacity-50">lock</span>
                View Decision
              </button>
            )}
            {project.status === "processing" ? (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                Analysis in progress…
              </p>
            ) : project.status !== "ready" ? (
              <p className="text-[10px] text-muted-foreground">Run analysis to unlock</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Interviews tab — constrained */}
      {activeTab === "interviews" && (
        <main className="flex-1 max-w-[1240px] mx-auto w-full px-4 md:px-5 pb-14 mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Interviews</h2>
            <div className="flex items-center gap-3">
              <RunAnalysisButton
                projectId={projectId}
                interviewCount={project.interview_count}
                projectStatus={project.status}
              />
              <Link
                href={`/interviews/${projectId}/add`}
                className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
              >
                + Add Interview
              </Link>
            </div>
          </div>

          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between gap-5">
            <div className="flex flex-wrap items-center gap-6 md:gap-10">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Decision
                </span>
                <span className="text-base font-bold text-[#FF6A4D]">{decisionLabel}</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Confidence
                </span>
                <span className="text-base font-bold">{confidencePct}%</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
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
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}
              {interviews.length === 0 ? (
                <div className="border border-border rounded-xl p-8 text-center text-muted-foreground bg-card">
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
                      className="block bg-card rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-6 gap-4">
                        <div className="flex space-x-4 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-lg font-bold shrink-0">
                            {initialForName(interview.interviewee_name, i)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold truncate">
                              {interview.interviewee_name ?? `Interview #${i + 1}`}
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium truncate">
                              {interview.interviewee_context ?? "No interview context provided"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`${signalClass} px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider`}
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
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Delete interview"
                            title="Delete interview"
                          >
                            <span className="material-symbols-outlined text-[16px] leading-none">
                              {deleteLoadingId === interview.id ? "hourglass_top" : "delete"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          Context:{" "}
                          {interview.interviewee_context ??
                            "Interview details available in the full transcript."}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div className="bg-muted/40 rounded-xl p-4">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">
                              Key Problems
                            </span>
                            <ul className="space-y-2">
                              <li className="flex items-start text-xs text-foreground">
                                <span className="text-[#FF6A4D] mr-2">•</span> {problemSnippet}
                              </li>
                            </ul>
                          </div>
                          <div className="bg-muted/40 rounded-xl p-4">
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
              <div className="bg-[#11151C] text-white rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-base font-bold">Live Insights</h2>
                  <span className="flex h-2 w-2 rounded-full bg-[#FF6A4D] animate-pulse" />
                </div>
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block mb-4">
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
                                  className={`w-5 text-[10px] font-bold ${active ? "text-[#FF6A4D]" : "text-gray-500"}`}
                                >
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                <span className={`text-xs truncate ${active ? "text-gray-200" : "text-gray-400"}`} title={cluster.canonical_problem}>
                                  {toLiveInsightsClusterTitle(cluster.canonical_problem)}
                                </span>
                              </div>
                              <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden shrink-0">
                                <div
                                  className={`${active ? "bg-[#FF6A4D]" : "bg-gray-400"} h-full`}
                                  style={{ width: `${bar}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-gray-400">No clusters available yet.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block mb-4">
                      Emerging Patterns
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(rankedClusters.map((c) => c.category).filter(Boolean).slice(0, 3) as string[]).map(
                        (pattern, idx) => (
                          <span
                            key={`${pattern}-${idx}`}
                            className={`text-[10px] px-2 py-1 rounded border ${
                              idx === 0
                                ? "bg-[#FF6A4D]/20 border-[#FF6A4D]/30 text-[#FF6A4D]"
                                : "bg-white/5 border-white/10 text-gray-300"
                            }`}
                          >
                            {pattern}
                          </span>
                        )
                      )}
                      {rankedClusters.length === 0 && (
                        <span className="text-[10px] text-gray-400">No patterns yet</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] uppercase font-bold text-gray-500">Confidence</span>
                      <span className="text-xl font-bold text-[#FF6A4D]">{confidencePct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800 rounded-full">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-[#FF6A4D] rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, confidencePct))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block mb-4">
                      Suggested Features
                    </span>
                    <ul className="space-y-3">
                      {suggestedFeatures.length > 0 ? (
                        suggestedFeatures.map((feature, idx) => (
                          <li key={`${feature.name}-${idx}`} className="text-xs text-gray-400 flex items-start">
                            <span className="mr-2 text-[#FF6A4D]">•</span>
                            {feature.name}
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-gray-400">No suggested features yet.</li>
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
        <div className="flex flex-col flex-1 min-h-0">
          <InterviewScriptTab projectId={projectId} projectName={project.name} />
        </div>
      )}
    </div>
  );
}

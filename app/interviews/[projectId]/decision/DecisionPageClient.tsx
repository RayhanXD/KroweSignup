"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MetaClusterCard } from "./MetaClusterCard";
import { AllProblemsButton } from "./AllProblemsButton";
import type { AnalysisResponse } from "@/lib/analysis/hypothesisVsReality";
import type {
  ProblemCluster,
  FeatureSpec,
  UserFlow,
  EdgeCase,
  SuccessMetric,
  DecisionOutput,
  MetaCluster,
} from "@/lib/interviews/types";

type ClusterWithId = ProblemCluster & { id: string };
type DecisionWithId = Omit<DecisionOutput, "project_id"> & {
  id: string;
  updated_at: string;
};

type Props = {
  projectId: string;
  project: { id: string; name: string };
  decision: DecisionWithId;
  topCluster: ClusterWithId | null;
  allClusters: ClusterWithId[];
  metaClusters: MetaCluster[];
  featureSpecs: FeatureSpec[];
  userFlows: UserFlow[];
  edgeCases: EdgeCase[];
  successMetrics: SuccessMetric[];
  sortedFeatures: FeatureSpec[];
  groupedFeatures: Record<string, FeatureSpec[]>;
  confidencePct: number;
  interviewsSortedIds: string[];
};

const DECISION_LABELS: Record<AnalysisResponse["decision"], string> = {
  proceed: "Proceed",
  refine: "Refine",
  pivot: "Pivot",
  rethink: "Rethink",
};

const DECISION_COLORS: Record<AnalysisResponse["decision"], string> = {
  proceed: "bg-green-100 text-green-800 border-green-200",
  refine: "bg-yellow-100 text-yellow-800 border-yellow-200",
  pivot: "bg-orange-100 text-orange-800 border-orange-200",
  rethink: "bg-red-100 text-red-800 border-red-200",
};

const DECISION_BAR_COLORS: Record<AnalysisResponse["decision"], string> = {
  proceed: "bg-green-500",
  refine: "bg-yellow-500",
  pivot: "bg-orange-500",
  rethink: "bg-red-500",
};

const MATCH_STATUS_STYLES: Record<string, string> = {
  strong_match: "bg-green-100 text-green-700 border-green-200",
  partial_match: "bg-yellow-100 text-yellow-700 border-yellow-200",
  mismatch: "bg-red-100 text-red-700 border-red-200",
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  strong_match: "Strong Match",
  partial_match: "Partial Match",
  mismatch: "Mismatch",
};

const ALIGNMENT_STATUS_STYLES: Record<string, string> = {
  aligned: "bg-green-100 text-green-700 border-green-200",
  partially_aligned: "bg-yellow-100 text-yellow-700 border-yellow-200",
  misaligned: "bg-red-100 text-red-700 border-red-200",
};

const ALIGNMENT_STATUS_LABELS: Record<string, string> = {
  aligned: "Aligned",
  partially_aligned: "Partially Aligned",
  misaligned: "Misaligned",
};

const SIGNAL_LABEL_STYLES: Record<string, string> = {
  Strong: "bg-green-100 text-green-700 border-green-200",
  Moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Weak: "bg-red-100 text-red-700 border-red-200",
};

const analysisCache = new Map<string, AnalysisResponse>();

const priorityStyles: Record<FeatureSpec["priority"], string> = {
  "must-have": "bg-red-50 text-red-700 border-red-200",
  "should-have": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "nice-to-have": "bg-blue-50 text-blue-700 border-blue-200",
};

function deriveSignalLabel(score: number): "Strong" | "Moderate" | "Weak" {
  if (score >= 0.65) return "Strong";
  if (score >= 0.35) return "Moderate";
  return "Weak";
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded ${className ?? "h-4 w-full"}`} />;
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function MetricBar({
  label,
  value,
  max = 1,
  displayValue,
}: {
  label: string;
  value: number;
  max?: number;
  displayValue: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{displayValue}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionCard({
  heading,
  children,
  className,
}: {
  heading: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-6 ${className ?? ""}`}>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </h3>
      {children}
    </div>
  );
}

function ScoreBar({ label, value, max = 1 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-medium">{value.toFixed(2)}</span>
    </div>
  );
}

function QuoteCard({
  quote,
  interviewLabel,
  rankLabel,
  isParaphrased,
}: {
  quote: ProblemCluster["supporting_quotes"][number];
  interviewLabel: string;
  rankLabel?: string;
  isParaphrased?: boolean;
}) {
  return (
    <div className="flex min-h-[120px] flex-col justify-between rounded-xl border border-border bg-card p-5">
      {rankLabel && (
        <span className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {rankLabel}
        </span>
      )}
      <p className="text-sm italic leading-relaxed text-foreground/90">&ldquo;{quote.text}&rdquo;</p>
      <cite className="mt-3 block text-xs font-medium not-italic text-muted-foreground">
        {interviewLabel}
      </cite>
      {isParaphrased && (
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
          Paraphrased fallback
        </span>
      )}
    </div>
  );
}

function DashboardCard({
  children,
  className,
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-6 ${
        accent ? "border-t-2 border-t-foreground" : ""
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

export function DecisionPageClient({
  projectId,
  project,
  topCluster,
  allClusters,
  metaClusters,
  userFlows,
  edgeCases,
  successMetrics,
  sortedFeatures,
  groupedFeatures,
  interviewsSortedIds,
}: Props) {
  const router = useRouter();
  const [analysisState, setAnalysisState] = useState<"loading" | "error" | "ready">(
    analysisCache.has(projectId) ? "ready" : "loading"
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(
    analysisCache.get(projectId) ?? null
  );
  const [analysisError, setAnalysisError] = useState("");
  const requestIdRef = useRef(0);

  const fetchAnalysis = (opts?: { signal?: AbortSignal; requestId?: number }) => {
    const requestId = opts?.requestId ?? ++requestIdRef.current;
    setAnalysisState("loading");
    setAnalysisError("");

    fetch(`/api/interviews/analysis/${projectId}`, { signal: opts?.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<AnalysisResponse>;
      })
      .then((data) => {
        if (opts?.signal?.aborted) return;
        if (requestId !== requestIdRef.current) return;
        analysisCache.set(projectId, data);
        setAnalysisResult(data);
        setAnalysisState("ready");
      })
      .catch((err) => {
        if (opts?.signal?.aborted) return;
        if (requestId !== requestIdRef.current) return;
        setAnalysisError(err instanceof Error ? err.message : "Unknown error");
        setAnalysisState("error");
      });
  };

  useEffect(() => {
    const cached = analysisCache.get(projectId) ?? null;
    setAnalysisResult(cached);
    setAnalysisError("");
    setAnalysisState(cached ? "ready" : "loading");

    if (cached) return;

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    fetchAnalysis({ signal: controller.signal, requestId });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleRetry = () => {
    analysisCache.delete(projectId);
    setAnalysisResult(null);
    setAnalysisError("");
    fetchAnalysis();
  };

  const renderHypothesisCards = () => {
    if (analysisState === "loading") {
      return (
        <div className="space-y-4">
          {[0, 1, 2].map((card) => (
            <div key={card} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <SkeletonLine className="h-3 w-24" />
              </div>
              <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="space-y-2 p-5">
                  <SkeletonLine className="mb-3 h-3 w-16" />
                  <SkeletonLine />
                  <SkeletonLine className="h-4 w-4/5" />
                </div>
                <div className="space-y-2 p-5">
                  <SkeletonLine className="mb-3 h-3 w-16" />
                  <SkeletonLine />
                  <SkeletonLine className="h-4 w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (analysisState === "error") {
      return (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-red-600">
            {analysisError === "No onboarding data linked"
              ? "No onboarding data linked to this project."
              : "Analysis unavailable. The core decision data is still available below."}
          </p>
          <p className="text-xs text-muted-foreground">{analysisError}</p>
          <div>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!analysisResult?.context) return null;

    const { breakdown, context } = analysisResult;

    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              The Problem
            </h3>
            <StatusBadge
              label={MATCH_STATUS_LABELS[breakdown.problemMatch.status]}
              className={MATCH_STATUS_STYLES[breakdown.problemMatch.status]}
            />
          </div>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="space-y-2 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                You assumed
              </p>
              <p className="text-sm leading-relaxed text-foreground/80">
                {context.founderProblem || "-"}
              </p>
            </div>
            <div className="space-y-2 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Interviews showed
              </p>
              {context.topProblem ? (
                <p className="text-sm leading-relaxed text-foreground/80">{context.topProblem}</p>
              ) : null}
              {context.topQuotes.map((quote, index) => (
                <p
                  key={index}
                  className="border-l-2 border-border pl-3 text-xs italic text-muted-foreground"
                >
                  &ldquo;{quote.text}&rdquo;
                </p>
              ))}
              {!context.topProblem && context.topQuotes.length === 0 && (
                <p className="text-xs text-muted-foreground/50">No interview data</p>
              )}
            </div>
          </div>
          {breakdown.problemMatch.reasoning && (
            <div className="border-t border-border bg-muted/10 px-5 py-3">
              <p className="text-xs text-muted-foreground">{breakdown.problemMatch.reasoning}</p>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              The Customer
            </h3>
            <StatusBadge
              label={ALIGNMENT_STATUS_LABELS[breakdown.customerAlignment.status]}
              className={ALIGNMENT_STATUS_STYLES[breakdown.customerAlignment.status]}
            />
          </div>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="space-y-2 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                You assumed
              </p>
              <p className="text-sm leading-relaxed text-foreground/80">
                {context.founderCustomer || "-"}
              </p>
            </div>
            <div className="space-y-2 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Interviews showed
              </p>
              <p className="text-sm leading-relaxed text-foreground/80">
                {context.customerInsight || "-"}
              </p>
            </div>
          </div>
          {breakdown.customerAlignment.reasoning && (
            <div className="border-t border-border bg-muted/10 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                {breakdown.customerAlignment.reasoning}
              </p>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              The Solution
            </h3>
          </div>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="space-y-2 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                You planned
              </p>
              {context.founderFeatures.length > 0 ? (
                <ul className="space-y-1">
                  {context.founderFeatures.map((feature, index) => (
                    <li key={index} className="text-sm text-foreground/80">
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground/50">No features listed</p>
              )}
            </div>
            <div className="space-y-4 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                What interviews showed
              </p>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-green-600">
                    Must-build
                  </p>
                  {breakdown.featureRelevance.relevant.length > 0 ? (
                    <ul className="space-y-0.5">
                      {breakdown.featureRelevance.relevant.map((feature, index) => (
                        <li key={index} className="text-xs text-foreground/80">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">None</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-yellow-600">
                    Missing
                  </p>
                  {breakdown.featureRelevance.missing.length > 0 ? (
                    <ul className="space-y-0.5">
                      {breakdown.featureRelevance.missing.map((feature, index) => (
                        <li key={index} className="text-xs text-foreground/80">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">None</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                    Cut
                  </p>
                  {breakdown.featureRelevance.unnecessary.length > 0 ? (
                    <ul className="space-y-0.5">
                      {breakdown.featureRelevance.unnecessary.map((feature, index) => (
                        <li key={index} className="text-xs text-foreground/80">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">None</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-12 flex w-full flex-col gap-6 rounded-xl border border-border bg-muted/50 px-8 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <Link
                  href={`/interviews/${projectId}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Back to project
                </Link>
                <span className="text-xs text-muted-foreground/40">·</span>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/auth/signin");
                  }}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Log out
                </button>
              </div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">Product Decision Report</p>
            </div>

            <div className="flex min-w-[160px] flex-col items-center gap-2">
              {analysisState === "loading" && (
                <>
                  <SkeletonLine className="mb-2 h-12 w-32" />
                  <SkeletonLine className="h-2 w-48" />
                </>
              )}
              {analysisState === "error" && (
                <span className="inline-block rounded-xl border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
                  Verdict unavailable
                </span>
              )}
              {analysisState === "ready" && analysisResult && (
                <>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Verdict
                  </span>
                  <span
                    className={`inline-block rounded-xl border px-4 py-2 text-3xl font-bold ${DECISION_COLORS[analysisResult.decision]}`}
                  >
                    {DECISION_LABELS[analysisResult.decision]}
                  </span>
                  <div className="flex w-48 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Analysis Confidence</span>
                      <span className="text-xs font-bold">
                        {Math.round(analysisResult.confidence * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${DECISION_BAR_COLORS[analysisResult.decision]}`}
                        style={{ width: `${Math.round(analysisResult.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {topCluster && (
              <div className="max-w-xs">
                <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                  Top Problem
                </span>
                <p className="line-clamp-2 text-sm font-medium">{topCluster.canonical_problem}</p>
                <span className="mt-1 inline-block rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
                  Score: {topCluster.score.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {topCluster && (
            <DashboardCard accent className="lg:col-span-12">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <SectionHeading>Top Problem</SectionHeading>
                  <p className="text-xl font-semibold">{topCluster.canonical_problem}</p>
                  <div className="space-y-2">
                    <ScoreBar label="Frequency" value={Math.min(topCluster.frequency / 10, 1)} />
                    <ScoreBar label="Avg Intensity" value={topCluster.avg_intensity} max={5} />
                    <ScoreBar label="Consistency" value={topCluster.consistency_score} />
                    <ScoreBar label="Overall score" value={topCluster.score} />
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Interview Signal Strength
                  </p>
                  {analysisState === "loading" && (
                    <div className="space-y-3 pt-1">
                      <SkeletonLine className="h-2" />
                      <SkeletonLine className="h-2" />
                      <SkeletonLine className="h-2" />
                      <SkeletonLine className="h-2" />
                    </div>
                  )}
                  {analysisState === "ready" && analysisResult?.signalMetrics && (() => {
                    const metrics = analysisResult.signalMetrics;
                    const signalLabel = deriveSignalLabel(metrics.clusterScore);
                    return (
                      <div className="space-y-3">
                        <StatusBadge
                          label={signalLabel}
                          className={SIGNAL_LABEL_STYLES[signalLabel]}
                        />
                        <div className="space-y-3 pt-1">
                          <MetricBar
                            label="Spread"
                            value={metrics.uniqueInterviewees}
                            max={Math.max(metrics.interviewCount, 1)}
                            displayValue={`${metrics.uniqueInterviewees} of ${metrics.interviewCount} interviews`}
                          />
                          <MetricBar
                            label="Consistency"
                            value={metrics.consistencyScore}
                            max={1}
                            displayValue={`${Math.round(metrics.consistencyScore * 100)}%`}
                          />
                          <MetricBar
                            label="Avg Intensity"
                            value={metrics.avgIntensity}
                            max={5}
                            displayValue={`${metrics.avgIntensity.toFixed(1)} / 5`}
                          />
                          <MetricBar
                            label="Problem Mentions"
                            value={Math.min(metrics.frequency / 10, 1)}
                            max={1}
                            displayValue={String(metrics.frequency)}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  {analysisState === "ready" && !analysisResult?.signalMetrics && (
                    <p className="text-sm text-muted-foreground">No signal data available.</p>
                  )}
                  {analysisState === "error" && (
                    <p className="text-sm text-muted-foreground">Signal data unavailable.</p>
                  )}
                </div>
              </div>
            </DashboardCard>
          )}

          <div className="lg:col-span-12">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Hypothesis vs Reality</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AI analysis comparing your original assumptions against real user interview
                data.
              </p>
            </div>
            {renderHypothesisCards()}
          </div>

          <div className="lg:col-span-12">
            <SectionCard heading="Recommendations">
              {analysisState === "loading" && (
                <div className="space-y-3">
                  <SkeletonLine />
                  <SkeletonLine className="h-4 w-5/6" />
                  <SkeletonLine className="h-4 w-4/6" />
                </div>
              )}
              {analysisState === "error" && (
                <p className="text-sm text-muted-foreground">Recommendations unavailable.</p>
              )}
              {analysisState === "ready" && analysisResult?.recommendation.length ? (
                <ul className="space-y-2">
                  {analysisResult.recommendation.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                      <span className="leading-relaxed">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </SectionCard>
          </div>

          {topCluster && (
            <div className="md:col-span-2 lg:col-span-12">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Voice of the Customer
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(() => {
                  const rankLabels = ["Weakest Signal", "Moderate Signal", "Strongest Signal"];
                  const quotes = [...topCluster.supporting_quotes.slice(0, 3)].reverse();
                  return [0, 1, 2].map((index) => {
                    const quote = quotes[index];
                    if (!quote) {
                      return (
                        <div
                          key={index}
                          className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-5"
                        >
                          <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {rankLabels[index]}
                          </span>
                          <span className="text-xs text-muted-foreground/50">
                            No quote available
                          </span>
                        </div>
                      );
                    }

                    const interviewIndex = interviewsSortedIds.indexOf(quote.interview_id);
                    const interviewLabel =
                      interviewIndex >= 0 ? `Interview #${interviewIndex + 1}` : "Interview";

                    return (
                      <QuoteCard
                        key={index}
                        quote={quote}
                        interviewLabel={interviewLabel}
                        rankLabel={rankLabels[index]}
                        isParaphrased={!quote.verbatim_text}
                      />
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {metaClusters.length > 0 && (
            <DashboardCard className="lg:col-span-12 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Problem Landscape
                </h2>
                {allClusters.length > 0 && <AllProblemsButton allClusters={allClusters} />}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metaClusters.map((metaCluster) => (
                  <MetaClusterCard
                    key={metaCluster.id}
                    mc={metaCluster}
                    allClusters={allClusters}
                  />
                ))}
              </div>
            </DashboardCard>
          )}

          {sortedFeatures.length > 0 && (
            <DashboardCard className="md:col-span-2 lg:col-span-12">
              <SectionHeading>What to Build</SectionHeading>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {(["must-have", "should-have", "nice-to-have"] as FeatureSpec["priority"][]).map(
                  (priority) => {
                    const features = groupedFeatures[priority];
                    if (!features?.length) return null;

                    return (
                      <div key={priority}>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide capitalize">
                          <span
                            className={`inline-block rounded border px-2 py-0.5 text-xs ${priorityStyles[priority]}`}
                          >
                            {priority}
                          </span>
                        </h3>
                        <div className="space-y-3">
                          {features.map((feature, index) => (
                            <div key={index} className="rounded-lg border border-border p-4">
                              <p className="mb-1 text-sm font-medium">{feature.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {feature.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </DashboardCard>
          )}

          {userFlows.length > 0 && (
            <DashboardCard className="lg:col-span-6 space-y-6">
              <SectionHeading>User Flows</SectionHeading>
              {userFlows.map((flow, index) => (
                <div key={index}>
                  <h3 className="mb-3 text-sm font-medium">{flow.title}</h3>
                  <ol className="space-y-1.5">
                    {flow.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-3 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {stepIndex + 1}
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </DashboardCard>
          )}

          {edgeCases.length > 0 && (
            <DashboardCard className="lg:col-span-6 space-y-4">
              <SectionHeading>Edge Cases</SectionHeading>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-6 font-medium">Scenario</th>
                      <th className="pb-2 font-medium">Mitigation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {edgeCases.map((edgeCase, index) => (
                      <tr key={index} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-6 align-top font-medium">
                          {edgeCase.scenario}
                        </td>
                        <td className="py-3 align-top text-muted-foreground">
                          {edgeCase.mitigation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          )}

          {successMetrics.length > 0 && (
            <DashboardCard className="md:col-span-2 lg:col-span-12">
              <SectionHeading>Success Metrics</SectionHeading>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {successMetrics.map((metric, index) => (
                  <div key={index} className="space-y-1.5 rounded-lg border border-border p-4">
                    <p className="text-sm font-medium">{metric.metric}</p>
                    <p className="text-sm font-bold">{metric.target}</p>
                    <p className="text-xs text-muted-foreground">{metric.rationale}</p>
                  </div>
                ))}
              </div>
            </DashboardCard>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { AllProblemsButton } from "./AllProblemsButton";
import type { AnalysisResponse, AnalysisResult } from "@/lib/analysis/hypothesisVsReality";
import type {
  ProblemCluster,
  FeatureSpec,
  UserFlow,
  EdgeCase,
  SuccessMetric,
  DecisionOutput,
  MetaCluster,
} from "@/lib/interviews/types";
import "./decision-report.css";

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
  userFlows: UserFlow[];
  edgeCases: EdgeCase[];
  successMetrics: SuccessMetric[];
  sortedFeatures: FeatureSpec[];
  confidencePct: number;
  interviewsSortedIds: string[];
  persistedAnalysis: AnalysisResult | null;
};

const DECISION_LABELS: Record<AnalysisResponse["decision"], string> = {
  proceed: "Proceed",
  refine: "Refine",
  pivot: "Pivot",
  rethink: "Rethink",
};

const MATCH_STATUS_STYLES: Record<string, string> = {
  strong_match: "bg-success-soft text-success border-success/40",
  partial_match: "bg-warning-soft text-warning border-warning/40",
  mismatch: "bg-danger-soft text-danger border-danger/40",
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  strong_match: "Strong match",
  partial_match: "Partial match",
  mismatch: "Mismatch",
};

const ALIGNMENT_STATUS_STYLES: Record<string, string> = {
  aligned: "bg-success-soft text-success border-success/40",
  partially_aligned: "bg-warning-soft text-warning border-warning/40",
  misaligned: "bg-danger-soft text-danger border-danger/40",
};

const ALIGNMENT_STATUS_LABELS: Record<string, string> = {
  aligned: "Aligned",
  partially_aligned: "Partially aligned",
  misaligned: "Misaligned",
};

const SIGNAL_LABEL_STYLES: Record<string, string> = {
  Strong: "bg-success-soft text-success border-success/40",
  Moderate: "bg-warning-soft text-warning border-warning/40",
  Weak: "bg-danger-soft text-danger border-danger/40",
};

const PRIORITY_ICONS: Record<FeatureSpec["priority"], string> = {
  "must-have": "bolt",
  "should-have": "layers",
  "nice-to-have": "shield",
};

function getBuildTierClass(index: number): string {
  if (index <= 1) return "dr-build-tier-green";
  if (index <= 3) return "dr-build-tier-yellow";
  return "dr-build-tier-orange";
}

function getFlowStepClass(index: number): string {
  if (index <= 0) return "dr-flow-step-1";
  if (index === 1) return "dr-flow-step-2";
  return "dr-flow-step-3";
}

const RING_R = 148;
const RING_C = 2 * Math.PI * RING_R;

function ringOffsetForPercent(pct: number) {
  const p = Math.min(100, Math.max(0, pct));
  return RING_C * (1 - p / 100);
}

function deriveSignalLabel(score: number): "Strong" | "Moderate" | "Weak" {
  if (score >= 0.65) return "Strong";
  if (score >= 0.35) return "Moderate";
  return "Weak";
}

function sanitizeReasoningString(s: string): string {
  return s
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

/** DB / pipeline may store reasoning as string[] or a single string (legacy paths). */
function reasoningToStringParts(reasoning: unknown): string[] {
  if (reasoning == null) return [];
  if (Array.isArray(reasoning)) {
    return reasoning.filter((item): item is string => typeof item === "string");
  }
  if (typeof reasoning === "string") {
    const t = reasoning.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === "string");
        }
      } catch {
        // fall through to treat as plain string
      }
    }
    return [t];
  }
  return [];
}

function getReasoningDisplayItems(
  decision: DecisionWithId,
  analysisResult: AnalysisResponse | null
): string[] {
  const fromReasoning = reasoningToStringParts(decision.reasoning)
    .map(sanitizeReasoningString)
    .filter(Boolean);
  if (fromReasoning.length > 0) return fromReasoning;
  return (analysisResult?.recommendation ?? [])
    .map(sanitizeReasoningString)
    .filter(Boolean)
    .slice(0, 3);
}

function formatDecisionTimestamp(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
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

type ImpactBar = { label: string; pct: number; tone: "primary" | "tertiary" | "primarySoft" };

function ImpactDistribution({ bars, loading }: { bars: ImpactBar[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <SkeletonLine className="h-3 w-16" />
            <div className="h-1.5 flex-1 rounded-full bg-muted">
              <SkeletonLine className="h-full w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const barClass = (tone: ImpactBar["tone"]) => {
    if (tone === "tertiary") return "dr-impact-fill-muted";
    if (tone === "primarySoft") return "dr-impact-fill-soft";
    return "dr-impact-fill laser-line";
  };

  return (
    <div className="space-y-3">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-4">
          <span className="font-label w-20 text-[9px] uppercase tracking-wide opacity-90">
            {b.label}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${barClass(b.tone)} ${
                b.tone === "tertiary" || b.tone === "primary" ? "laser-line" : ""
              }`}
              style={{ width: `${Math.min(100, b.pct)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function VoiceQuoteCard({
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
    <div className="dr-quote-card dr-panel-rounded">
      <span className="dr-quote-icon material-symbols-outlined mb-4 block">format_quote</span>
      {rankLabel && (
        <span className="font-label mb-2 block text-[10px] font-semibold uppercase tracking-wide">
          {rankLabel}
        </span>
      )}
      <p className="dr-body-text text-sm leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-3 border-t border-[color:color-mix(in_srgb,var(--dr-rule)_75%,transparent)] pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card">
          <span className="font-label text-[10px]">#</span>
        </div>
        <span className="font-label text-[10px] font-bold uppercase tracking-widest">
          {interviewLabel}
        </span>
      </div>
      {isParaphrased && (
        <span className="dr-body-text mt-2 block text-[10px] uppercase tracking-wide opacity-80">
          Paraphrased summary
        </span>
      )}
    </div>
  );
}

export function DecisionPageClient({
  projectId,
  project,
  decision,
  topCluster,
  allClusters,
  metaClusters,
  userFlows,
  edgeCases,
  successMetrics,
  sortedFeatures,
  confidencePct,
  interviewsSortedIds,
  persistedAnalysis,
}: Props) {
  const router = useRouter();
  const [analysisState, setAnalysisState] = useState<"loading" | "error" | "ready">(
    persistedAnalysis ? "ready" : "loading"
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(
    persistedAnalysis ? (persistedAnalysis as AnalysisResponse) : null
  );
  const [analysisError, setAnalysisError] = useState("");
  const requestIdRef = useRef(0);

  const reasoningDisplayItems = useMemo(
    () => getReasoningDisplayItems(decision, analysisResult),
    [decision, analysisResult]
  );

  const displayConfidencePct = useMemo(() => {
    if (analysisState === "ready" && analysisResult) {
      return Math.round(analysisResult.confidence * 1000) / 10;
    }
    return confidencePct;
  }, [analysisState, analysisResult, confidencePct]);

  const ringPercent = useMemo(() => {
    if (analysisState === "ready" && analysisResult) {
      return Math.min(100, Math.max(0, analysisResult.confidence * 100));
    }
    return Math.min(100, Math.max(0, confidencePct));
  }, [analysisState, analysisResult, confidencePct]);

  const impactBars: ImpactBar[] | null = useMemo(() => {
    if (!topCluster) return [];
    if (analysisState === "loading") return null;

    if (analysisState === "ready" && analysisResult?.signalMetrics) {
      const m = analysisResult.signalMetrics;
      const reach =
        m.interviewCount > 0 ? (m.uniqueInterviewees / m.interviewCount) * 100 : 0;
      return [
        { label: "Reach", pct: reach, tone: "tertiary" as const },
        { label: "Consistency", pct: m.consistencyScore * 100, tone: "primarySoft" as const },
        { label: "Intensity", pct: (m.avgIntensity / 5) * 100, tone: "primary" as const },
      ];
    }

    return [
      {
        label: "Reach",
        pct: Math.min(100, (topCluster.frequency / 10) * 100),
        tone: "tertiary",
      },
      {
        label: "Consistency",
        pct: topCluster.consistency_score * 100,
        tone: "primarySoft",
      },
      {
        label: "Intensity",
        pct: (topCluster.avg_intensity / 5) * 100,
        tone: "primary",
      },
    ];
  }, [topCluster, analysisState, analysisResult]);

  const landscapeItems = useMemo(
    () => [...metaClusters].sort((a, b) => b.score - a.score).slice(0, 3),
    [metaClusters]
  );

  const flowTimeline = useMemo(() => {
    const flow = userFlows[0];
    if (!flow?.steps?.length) return { title: "", steps: [] as string[] };
    return { title: flow.title, steps: flow.steps.slice(0, 3) };
  }, [userFlows]);

  const topSuccessMetrics = useMemo(() => successMetrics.slice(0, 4), [successMetrics]);

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
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    if (!persistedAnalysis) {
      setAnalysisResult(null);
      setAnalysisError("");
      setAnalysisState("loading");
    }

    fetch(`/api/interviews/analysis/${projectId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<AnalysisResponse>;
      })
      .then((data) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setAnalysisResult(data);
        setAnalysisState("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        if (!persistedAnalysis) {
          setAnalysisError(err instanceof Error ? err.message : "Unknown error");
          setAnalysisState("error");
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleRetry = () => {
    setAnalysisResult(null);
    setAnalysisError("");
    fetchAnalysis();
  };

  const signalCardBody = () => {
    if (analysisState === "loading") {
      return <SkeletonLine className="h-16 w-full" />;
    }
    if (analysisState === "error") {
      return (
        <p className="dr-body-text text-sm leading-relaxed">
          Interview signal summary is unavailable. Problem scores below still reflect your latest
          analysis run.
        </p>
      );
    }
    if (analysisResult?.breakdown.problemMatch.reasoning) {
      return (
        <p className="dr-body-text line-clamp-3 text-sm leading-relaxed">
          {analysisResult.breakdown.problemMatch.reasoning}
        </p>
      );
    }
    if (topCluster) {
      return (
        <p className="dr-body-text line-clamp-3 text-sm leading-relaxed">
          Overall cluster score {topCluster.score.toFixed(2)} — frequency {topCluster.frequency},
          consistency {Math.round(topCluster.consistency_score * 100)}%.
        </p>
      );
    }
    return <p className="dr-body-text text-sm">No signal summary.</p>;
  };

  const signalBadge = () => {
    if (analysisState === "loading") return null;
    if (analysisState === "ready" && analysisResult?.signalMetrics) {
      const label = deriveSignalLabel(analysisResult.signalMetrics.clusterScore);
      return <StatusBadge label={label} className={SIGNAL_LABEL_STYLES[label]} />;
    }
    if (topCluster) {
      const label = deriveSignalLabel(topCluster.score);
      return <StatusBadge label={label} className={SIGNAL_LABEL_STYLES[label]} />;
    }
    return null;
  };

  const renderHypothesisSection = () => {
    if (analysisState === "loading") {
      return (
        <div className="space-y-6">
          {[0, 1, 2].map((card) => (
            <div key={card} className="dr-panel dr-panel-rounded overflow-hidden">
              <div className="border-b border-[color:color-mix(in_srgb,var(--dr-rule)_80%,transparent)] px-5 py-3">
                <SkeletonLine className="h-3 w-32" />
              </div>
              <div className="grid grid-cols-1 divide-y divide-[color:color-mix(in_srgb,var(--dr-rule)_80%,transparent)] md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="space-y-2 p-8">
                  <SkeletonLine className="mb-3 h-3 w-24" />
                  <SkeletonLine />
                  <SkeletonLine className="h-4 w-4/5" />
                </div>
                <div className="space-y-2 p-8">
                  <SkeletonLine className="mb-3 h-3 w-24" />
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
        <div className="dr-panel dr-panel-rounded flex flex-col gap-3 p-6">
          <p className="text-sm text-danger">
            {analysisError === "No onboarding data linked"
              ? "No onboarding data linked to this project."
              : "Hypothesis comparison unavailable. Your interview-backed sections below are still valid."}
          </p>
          <p className="text-xs text-muted-foreground">{analysisError}</p>
          <div>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!analysisResult?.context) {
      return (
        <div className="space-y-6">
          {[0, 1, 2].map((card) => (
            <div key={card} className="dr-panel dr-panel-rounded overflow-hidden">
              <div className="border-b border-[color:color-mix(in_srgb,var(--dr-rule)_80%,transparent)] px-5 py-3">
                <SkeletonLine className="h-3 w-32" />
              </div>
              <div className="grid grid-cols-1 divide-y divide-[color:color-mix(in_srgb,var(--dr-rule)_80%,transparent)] md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="space-y-2 p-8">
                  <SkeletonLine className="mb-3 h-3 w-24" />
                  <SkeletonLine />
                  <SkeletonLine className="h-4 w-4/5" />
                </div>
                <div className="space-y-2 p-8">
                  <SkeletonLine className="mb-3 h-3 w-24" />
                  <SkeletonLine />
                  <SkeletonLine className="h-4 w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const { breakdown, context } = analysisResult;

    const rowShell = (
      title: string,
      left: ReactNode,
      right: ReactNode,
      icon: string,
      badge?: ReactNode
    ) => (
      <div>
        <div className="mb-2 pl-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em]">
              {title}
            </span>
            {badge}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--dr-rule)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--dr-rule)_55%,transparent)] md:grid-cols-2">
          <div className="bg-[var(--dr-surface)] p-8 md:p-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em]">
                Your hypothesis
              </span>
            </div>
            <div className="font-headline text-xl font-medium italic leading-relaxed">
              {left}
            </div>
          </div>
          <div className="bg-[var(--dr-surface)] p-8 md:p-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-[color:var(--dr-bullet)]">{icon}</span>
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em]">
                What interviews support
              </span>
            </div>
            <div className="font-headline dr-interviews-support-content text-xl font-medium leading-relaxed">
              {right}
            </div>
          </div>
        </div>
      </div>
    );

    const problemRight = (
      <div className="space-y-3 not-italic">
        {context.topProblem ? (
          <p className="dr-body-text text-xl font-medium leading-relaxed">{context.topProblem}</p>
        ) : null}
        {context.topQuotes.map((quote, index) => (
          <p
            key={index}
            className="dr-body-text border-l-2 border-[color:var(--dr-rule)] pl-3 text-base italic"
          >
            &ldquo;{quote.text}&rdquo;
          </p>
        ))}
        {!context.topProblem && context.topQuotes.length === 0 && (
          <p className="dr-body-text text-base">No interview data</p>
        )}
      </div>
    );

    const customerRight = (
      <p className="dr-body-text text-xl font-medium leading-relaxed not-italic">
        {context.customerInsight || "—"}
      </p>
    );

    const solutionRight = (
      <div className="space-y-4 not-italic">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-success">
            Aligns with plan
          </p>
          {breakdown.featureRelevance.relevant.length > 0 ? (
            <ul className="space-y-1">
              {breakdown.featureRelevance.relevant.map((feature, index) => (
                <li key={index} className="dr-body-text text-base">
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <p className="dr-body-text text-sm">None listed</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
            Gaps to address
          </p>
          {breakdown.featureRelevance.missing.length > 0 ? (
            <ul className="space-y-1">
              {breakdown.featureRelevance.missing.map((feature, index) => (
                <li key={index} className="dr-body-text text-base">
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <p className="dr-body-text text-sm">None listed</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-danger">
            Deprioritize
          </p>
          {breakdown.featureRelevance.unnecessary.length > 0 ? (
            <ul className="space-y-1">
              {breakdown.featureRelevance.unnecessary.map((feature, index) => (
                <li key={index} className="dr-body-text text-base">
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <p className="dr-body-text text-sm">None listed</p>
          )}
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {rowShell(
          "Problem fit",
          <span>{context.founderProblem || "—"}</span>,
          problemRight,
          "analytics",
          <StatusBadge
            label={MATCH_STATUS_LABELS[breakdown.problemMatch.status]}
            className={MATCH_STATUS_STYLES[breakdown.problemMatch.status]}
          />
        )}
        {breakdown.problemMatch.reasoning && (
          <p className="dr-body-text px-1 text-xs">{breakdown.problemMatch.reasoning}</p>
        )}

        {rowShell(
          "Customer fit",
          <span>{context.founderCustomer || "—"}</span>,
          customerRight,
          "groups",
          <StatusBadge
            label={ALIGNMENT_STATUS_LABELS[breakdown.customerAlignment.status]}
            className={ALIGNMENT_STATUS_STYLES[breakdown.customerAlignment.status]}
          />
        )}
        {breakdown.customerAlignment.reasoning && (
          <p className="dr-body-text px-1 text-xs">{breakdown.customerAlignment.reasoning}</p>
        )}

        {rowShell(
          "Solution fit",
          <div className="not-italic">
            {context.founderFeatures.length > 0 ? (
              <ul className="list-inside list-disc space-y-1">
                {context.founderFeatures.map((feature, index) => (
                  <li key={index} className="font-headline text-xl font-medium">
                    {feature}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xl">No features listed</span>
            )}
          </div>,
          solutionRight,
          "lightbulb"
        )}
      </div>
    );
  };

  const verdictLabel = analysisResult?.decision ? DECISION_LABELS[analysisResult.decision] : "Ready";

  return (
    <main className="decision-report font-sans relative min-h-screen overflow-hidden bg-background">
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-8">
        <div className="mb-10 flex flex-col gap-4 border-b border-[color:color-mix(in_srgb,var(--dr-rule)_90%,transparent)] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <Link
                href={`/interviews/${projectId}`}
                className="dr-body-text text-xs hover:underline"
              >
                Back to project
              </Link>
              <span className="dr-body-text text-xs opacity-40">·</span>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--dr-rule)_80%,transparent)] bg-[color:color-mix(in_srgb,var(--dr-surface)_88%,transparent)] px-2.5 py-1">
                <Image src="/KroweIcon.png" alt="Krowe" width={14} height={14} className="rounded-[3px]" />
                <span className="font-label text-[9px] uppercase tracking-[0.2em]">
                  Krowe report
                </span>
              </div>
              <span className="dr-body-text text-xs opacity-40">·</span>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/auth/signin");
                }}
                className="dr-body-text text-xs hover:underline"
              >
                Log out
              </button>
            </div>
            <h1 className="font-headline text-xl font-bold">{project.name}</h1>
            <p className="dr-body-text mt-1 text-sm">Interview decision report</p>
          </div>
        </div>

        {/* Verdict */}
        <section className="mb-16">
          <div className="flex flex-col items-center gap-14 md:flex-row md:items-start md:gap-16 lg:gap-20">
            {/* Left: orb */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full p-2 opacity-[0.35]" viewBox="0 0 320 320">
                  <circle
                    className="decision-ring-track"
                    cx="160"
                    cy="160"
                    r={RING_R}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <svg className="absolute inset-0 h-full w-full p-2" viewBox="0 0 320 320">
                  <circle
                    className="decision-ring-progress confidence-ring"
                    cx="160"
                    cy="160"
                    r={RING_R}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="4"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffsetForPercent(ringPercent)}
                    style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
                  />
                </svg>
                <div className="decision-core-orb relative z-10 flex h-52 w-52 flex-col items-center justify-center rounded-full">
                  <span className="font-label mb-1 text-[10px] font-bold uppercase tracking-[0.35em]">
                    Verdict
                  </span>
                  <h2 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">
                    {verdictLabel}
                  </h2>
                </div>
                <div className="absolute -top-4 right-0 text-right">
                  <span className="font-label mb-1 block text-[10px] font-bold uppercase tracking-[0.2em]">
                    Confidence
                  </span>
                  {analysisState === "loading" ? (
                    <SkeletonLine className="ml-auto h-8 w-20" />
                  ) : (
                    <span className="font-headline dr-bullet-text text-2xl font-bold">
                      {displayConfidencePct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-4 left-0 text-left">
                  <span className="font-label mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--dr-bullet)]">
                    Report status
                  </span>
                  <span className="font-label text-xs uppercase tracking-widest">
                    Analysis complete · Final
                  </span>
                </div>
              </div>
            </div>

            {/* Right: why this decision */}
            <div className="flex flex-1 flex-col gap-4">
              <section className="why-decision-panel rounded-r-xl p-6 pl-8 text-left md:ml-24 lg:ml-32 xl:ml-40 2xl:ml-44">
                <h2 className="font-headline mb-5 text-xl leading-tight md:text-[1.35rem]">
                  Why this decision
                </h2>
                {reasoningDisplayItems.length > 0 ? (
                  <ul className="why-decision-list space-y-4">
                    {reasoningDisplayItems.map((item, i) => (
                      <li key={i} className="why-decision-item flex gap-3 text-[15px] leading-relaxed">
                        <span
                          className="why-decision-bullet mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="why-decision-empty text-[15px] leading-relaxed">—</p>
                )}
              </section>

              {analysisState === "loading" && (
                <div className="space-y-2 text-left">
                  <SkeletonLine />
                  <SkeletonLine className="w-5/6" />
                </div>
              )}
              {analysisState === "error" && (
                <p className="dr-body-text text-sm">
                  AI recommendations are unavailable. The reasoning above is from your generated
                  decision; rerun analysis after linking onboarding if needed.
                </p>
              )}
            </div>
          </div>

          {/* Next steps — full width below */}
          {analysisState === "ready" && analysisResult?.recommendation?.length ? (
            <div className="dr-panel dr-panel-rounded mt-16 text-left">
              <p className="font-label mb-4 text-[10px] font-bold uppercase tracking-[0.2em]">
                Next steps
              </p>
              <ul className="space-y-3">
                {analysisResult.recommendation.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span
                      className="dr-next-bullet mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full"
                      aria-hidden
                    />
                    <span className="dr-body-text leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Top problem + landscape */}
        <div className="mb-14 grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <span className="font-label mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--dr-bullet)]">
              Primary friction
            </span>
            <h3 className="font-headline mb-6 text-2xl md:text-3xl">Top problem</h3>
            {topCluster ? (
              <div className="space-y-6">
                <div className="dr-panel dr-panel-rounded relative overflow-hidden">
                  <h4 className="font-label mb-3 text-xs font-bold uppercase tracking-widest text-[color:var(--dr-bullet)]">
                    {topCluster.category ? `${topCluster.category} · ` : ""}
                    Interview signal
                  </h4>
                  <p className="font-label mb-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                    #1 Top Problem
                  </p>
                  <p className="font-headline text-lg font-semibold leading-snug">
                    {topCluster.canonical_problem}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">{signalBadge()}</div>
                  <div className="relative mt-4 text-sm">{signalCardBody()}</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="font-label text-[10px] uppercase tracking-wide">
                      Evidence mix
                    </span>
                    <span className="font-label text-[10px] font-bold text-[color:var(--dr-bullet)]">
                      {analysisState === "ready" ? "Live" : analysisState === "loading" ? "…" : "Partial"}
                    </span>
                  </div>
                  <ImpactDistribution
                    bars={impactBars ?? []}
                    loading={analysisState === "loading" || impactBars === null}
                  />
                </div>
              </div>
            ) : (
              <p className="dr-body-text text-sm">
                No clustered problem yet. Add interviews and rerun analysis.
              </p>
            )}
          </div>

          <div className="dr-panel md:col-span-5 dr-panel-rounded">
            <span className="font-label mb-6 block text-[10px] font-bold uppercase tracking-[0.2em]">
              Problem landscape
            </span>
            {landscapeItems.length > 0 ? (
              <div className="space-y-8">
                {landscapeItems.map((mc, i) => (
                  <div key={mc.id} className="flex gap-4">
                    <span className="font-headline dr-bullet-text text-2xl font-bold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h5 className="font-headline mb-1 text-sm font-bold uppercase tracking-tight">
                        {mc.title}
                      </h5>
                      <p className="dr-body-text line-clamp-3 text-xs leading-relaxed">{mc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dr-body-text text-sm">No grouped themes yet.</p>
            )}
            {allClusters.length > 0 && (
              <div className="mt-6 flex justify-end">
                <AllProblemsButton allClusters={allClusters} />
              </div>
            )}
          </div>
        </div>

        {/* Voice of the customer */}
        {topCluster && (
          <section className="mb-14">
            <div className="mb-6 text-center">
              <h3 className="font-headline text-2xl md:text-3xl">Voice of the customer</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {(() => {
                const rankLabels = ["Weakest evidence", "Moderate evidence", "Strongest evidence"];
                const quotes = [...topCluster.supporting_quotes.slice(0, 3)].reverse();
                return [0, 1, 2].map((index) => {
                  const quote = quotes[index];
                  if (!quote) {
                    return (
                      <div
                        key={index}
                        className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-[color:color-mix(in_srgb,var(--dr-rule)_90%,transparent)] bg-muted p-8"
                      >
                        <span className="font-label mb-1 text-[10px] font-semibold uppercase tracking-wide">
                          {rankLabels[index]}
                        </span>
                        <span className="dr-body-text text-xs">No quote</span>
                      </div>
                    );
                  }
                  const interviewIndex = interviewsSortedIds.indexOf(quote.interview_id);
                  const interviewLabel =
                    interviewIndex >= 0 ? `Interview ${interviewIndex + 1}` : "Interview";

                  return (
                    <VoiceQuoteCard
                      key={`${quote.interview_id}-${index}`}
                      quote={quote}
                      interviewLabel={interviewLabel}
                      rankLabel={rankLabels[index]}
                      isParaphrased={!quote.verbatim_text}
                    />
                  );
                });
              })()}
            </div>
          </section>
        )}

        {/* Hypothesis vs reality */}
        <section className="mb-14">
          <div className="mb-6 text-center">
            <h3 className="font-headline text-2xl md:text-3xl">Hypothesis vs reality</h3>
            <p className="dr-body-text mt-2 text-sm">
              How your onboarding assumptions compare to what people said in interviews.
            </p>
          </div>
          {renderHypothesisSection()}
        </section>

        {/* What to build + flows */}
        <div className="mb-14 grid grid-cols-1 items-start gap-8 md:grid-cols-12">
          <div className="md:col-span-8">
            <h3 className="font-headline mb-8 text-2xl md:text-3xl">What to build</h3>
            {sortedFeatures.length > 0 ? (
              <div className="space-y-4">
                {sortedFeatures.map((feature, index) => (
                  <div
                    key={`${feature.name}-${index}`}
                    className={`dr-panel dr-panel-rounded dr-build-card ${getBuildTierClass(index)} group flex cursor-default items-center justify-between transition-colors`}
                  >
                    <div className="flex flex-1 items-center gap-4 pr-2">
                      <span
                        className="material-symbols-outlined dr-build-icon transition-transform group-hover:scale-110"
                        aria-hidden
                      >
                        {PRIORITY_ICONS[feature.priority]}
                      </span>
                      <div className="text-left">
                        <h4 className="font-headline text-sm font-bold uppercase tracking-wide">
                          {feature.name}
                        </h4>
                        <p className="dr-body-text text-xs">{feature.description}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined opacity-30" aria-hidden>
                      chevron_right
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dr-body-text text-sm">No feature specs in this decision.</p>
            )}
          </div>

          <div className="md:col-span-4">
            <h3 className="font-headline mb-8 text-2xl md:text-3xl">User flows</h3>
            {flowTimeline.steps.length > 0 ? (
              <div>
                {flowTimeline.title && (
                  <p className="font-label mb-4 text-[10px] font-bold uppercase tracking-widest">
                    {flowTimeline.title}
                  </p>
                )}
                <div className="dr-flow-timeline relative space-y-12 border-l py-4 pl-8">
                  {flowTimeline.steps.map((step, i) => (
                    <div key={i} className="relative">
                      <div className={`dr-flow-node absolute -left-[37px] top-0 h-2 w-2 rounded-full ${getFlowStepClass(i)}`} />
                      <h5 className="font-label mb-2 text-[10px] font-bold uppercase tracking-widest">
                        Step {i + 1}
                      </h5>
                      <p className="dr-body-text text-xs leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="dr-body-text text-sm">No user flows in this decision.</p>
            )}
          </div>
        </div>

        {/* Edge cases + metrics */}
        <div className="mb-10 grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <h3 className="font-headline mb-8 text-2xl md:text-3xl">Edge cases</h3>
            {edgeCases.length > 0 ? (
              <div className="dr-panel dr-panel-rounded">
                <ul className="space-y-4">
                  {edgeCases.map((edge, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="material-symbols-outlined dr-edge-signal-icon shrink-0 text-sm">
                        warning
                      </span>
                      <div>
                        <p className="dr-body-text text-sm">{edge.scenario}</p>
                        {edge.mitigation && (
                          <p className="dr-body-text mt-1 text-xs opacity-90">{edge.mitigation}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="dr-body-text text-sm">None listed.</p>
            )}
          </div>

          <div>
            <h3 className="font-headline mb-8 text-2xl md:text-3xl">Success metrics</h3>
            {topSuccessMetrics.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {topSuccessMetrics.map((metric, index) => (
                  <div
                    key={index}
                    className="dr-panel dr-panel-rounded text-center"
                  >
                    <p className="font-label mb-2 text-[10px] font-bold uppercase tracking-widest">
                      {metric.metric}
                    </p>
                    <span className="font-headline dr-success-metric-value text-xl font-bold md:text-2xl">
                      {metric.target}
                    </span>
                    {metric.rationale && (
                      <p className="dr-body-text mt-2 text-left text-[11px] leading-snug">
                        {metric.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="dr-body-text text-sm">None listed.</p>
            )}
          </div>
        </div>

        <div className="mt-20 h-px w-full bg-gradient-to-r from-transparent via-[color:color-mix(in_srgb,var(--dr-rule)_80%,transparent)] to-transparent opacity-80" />
        <footer className="flex flex-col gap-4 py-12 md:flex-row md:items-center md:justify-between">
          <span className="font-label text-[9px] uppercase tracking-[0.3em]">
            Krowe · Interview decision · {projectId}
          </span>
          <div className="flex flex-wrap gap-4">
            <span className="font-label text-[9px] uppercase tracking-[0.3em]">
              Updated {formatDecisionTimestamp(decision.updated_at)}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

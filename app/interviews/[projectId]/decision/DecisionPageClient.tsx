"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
  persistedVerdict: AnalysisResponse["decision"] | null;
};

const DECISION_LABELS: Record<AnalysisResponse["decision"], string> = {
  proceed: "Proceed",
  refine: "Refine",
  pivot: "Pivot",
  rethink: "Rethink",
};

const MATCH_STATUS_STYLES: Record<string, string> = {
  strong_match: "bg-green-100 text-green-700 border-green-200",
  partial_match: "bg-yellow-100 text-yellow-700 border-yellow-200",
  mismatch: "bg-red-100 text-red-700 border-red-200",
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  strong_match: "Strong match",
  partial_match: "Partial match",
  mismatch: "Mismatch",
};

const ALIGNMENT_STATUS_STYLES: Record<string, string> = {
  aligned: "bg-green-100 text-green-700 border-green-200",
  partially_aligned: "bg-yellow-100 text-yellow-700 border-yellow-200",
  misaligned: "bg-red-100 text-red-700 border-red-200",
};

const ALIGNMENT_STATUS_LABELS: Record<string, string> = {
  aligned: "Aligned",
  partially_aligned: "Partially aligned",
  misaligned: "Misaligned",
};

const SIGNAL_LABEL_STYLES: Record<string, string> = {
  Strong: "bg-green-100 text-green-700 border-green-200",
  Moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Weak: "bg-red-100 text-red-700 border-red-200",
};

const PRIORITY_ICONS: Record<FeatureSpec["priority"], string> = {
  "must-have": "bolt",
  "should-have": "layers",
  "nice-to-have": "shield",
};

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

function buildNarrativeText(decision: DecisionWithId, analysisResult: AnalysisResponse | null): string {
  const fromReasoning = reasoningToStringParts(decision.reasoning)
    .map(sanitizeReasoningString)
    .filter(Boolean)
    .join(" ");
  if (fromReasoning) return fromReasoning;
  const rec = (analysisResult?.recommendation ?? [])
    .map(sanitizeReasoningString)
    .filter(Boolean);
  return rec.slice(0, 3).join(" ");
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
    if (tone === "tertiary") return "bg-teal-600/80";
    if (tone === "primarySoft") return "bg-orange-400/80";
    return "bg-primary/80";
  };

  return (
    <div className="space-y-3">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-4">
          <span className="font-label w-20 text-[9px] uppercase tracking-wide text-muted-foreground opacity-80">
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
    <div className="glass-panel hover:signal-glow rounded-xl border border-border/30 p-5 transition-all">
      <span className="material-symbols-outlined mb-4 block text-primary/40">format_quote</span>
      {rankLabel && (
        <span className="font-label mb-2 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {rankLabel}
        </span>
      )}
      <p className="font-headline text-sm leading-relaxed text-foreground/90">
        &ldquo;{quote.text}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-3 border-t border-border/30 pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <span className="font-label text-[10px] text-muted-foreground">#</span>
        </div>
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
          {interviewLabel}
        </span>
      </div>
      {isParaphrased && (
        <span className="mt-2 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
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
  persistedVerdict,
}: Props) {
  const router = useRouter();
  const [analysisState, setAnalysisState] = useState<"loading" | "error" | "ready">("loading");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const requestIdRef = useRef(0);

  const narrativeText = useMemo(
    () => buildNarrativeText(decision, analysisResult),
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
    setAnalysisResult(null);
    setAnalysisError("");
    setAnalysisState("loading");

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    fetchAnalysis({ signal: controller.signal, requestId });
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
        <p className="text-sm leading-relaxed text-muted-foreground">
          Interview signal summary is unavailable. Problem scores below still reflect your latest
          analysis run.
        </p>
      );
    }
    if (analysisResult?.breakdown.problemMatch.reasoning) {
      return (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {analysisResult.breakdown.problemMatch.reasoning}
        </p>
      );
    }
    if (topCluster) {
      return (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          Overall cluster score {topCluster.score.toFixed(2)} — frequency {topCluster.frequency},
          consistency {Math.round(topCluster.consistency_score * 100)}%.
        </p>
      );
    }
    return <p className="text-sm text-muted-foreground">No signal summary.</p>;
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
            <div key={card} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <SkeletonLine className="h-3 w-32" />
              </div>
              <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
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
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-red-600">
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

    if (!analysisResult?.context) return null;

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
            <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {title}
            </span>
            {badge}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/30 bg-border/30 shadow-sm md:grid-cols-2">
          <div className="bg-card/90 p-8 transition-colors hover:bg-card md:p-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Your hypothesis
              </span>
            </div>
            <div className="font-headline text-xl font-medium italic leading-relaxed text-foreground/80">
              {left}
            </div>
          </div>
          <div className="bg-card/90 p-8 transition-colors hover:bg-card md:p-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                What interviews support
              </span>
            </div>
            <div className="font-headline text-xl font-medium leading-relaxed text-primary">
              {right}
            </div>
          </div>
        </div>
      </div>
    );

    const problemRight = (
      <div className="space-y-3 not-italic">
        {context.topProblem ? (
          <p className="text-xl font-medium leading-relaxed">{context.topProblem}</p>
        ) : null}
        {context.topQuotes.map((quote, index) => (
          <p
            key={index}
            className="border-l-2 border-primary/40 pl-3 text-base italic text-muted-foreground"
          >
            &ldquo;{quote.text}&rdquo;
          </p>
        ))}
        {!context.topProblem && context.topQuotes.length === 0 && (
          <p className="text-base text-muted-foreground">No interview data</p>
        )}
      </div>
    );

    const customerRight = (
      <p className="text-xl font-medium leading-relaxed not-italic">{context.customerInsight || "—"}</p>
    );

    const solutionRight = (
      <div className="space-y-4 not-italic">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-green-700">
            Aligns with plan
          </p>
          {breakdown.featureRelevance.relevant.length > 0 ? (
            <ul className="space-y-1">
              {breakdown.featureRelevance.relevant.map((feature, index) => (
                <li key={index} className="text-base text-foreground/90">
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None listed</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Gaps to address
          </p>
          {breakdown.featureRelevance.missing.length > 0 ? (
            <ul className="space-y-1">
              {breakdown.featureRelevance.missing.map((feature, index) => (
                <li key={index} className="text-base text-foreground/90">
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None listed</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
            Deprioritize
          </p>
          {breakdown.featureRelevance.unnecessary.length > 0 ? (
            <ul className="space-y-1">
              {breakdown.featureRelevance.unnecessary.map((feature, index) => (
                <li key={index} className="text-base text-foreground/90">
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None listed</p>
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
          <p className="px-1 text-xs text-muted-foreground">{breakdown.problemMatch.reasoning}</p>
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
          <p className="px-1 text-xs text-muted-foreground">
            {breakdown.customerAlignment.reasoning}
          </p>
        )}

        {rowShell(
          "Solution fit",
          <div className="not-italic">
            {context.founderFeatures.length > 0 ? (
              <ul className="list-inside list-disc space-y-1">
                {context.founderFeatures.map((feature, index) => (
                  <li key={index} className="text-xl font-medium text-foreground/80">
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

  const verdictLabel = persistedVerdict ? DECISION_LABELS[persistedVerdict] : "Ready";

  return (
    <main className="decision-report font-sans relative min-h-screen overflow-hidden bg-background">
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-8">
        <div className="mb-10 flex flex-col gap-4 border-b border-border/40 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <Link
                href={`/interviews/${projectId}`}
                className="text-xs text-muted-foreground hover:underline"
              >
                Back to project
              </Link>
              <span className="text-xs text-muted-foreground/40">·</span>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/auth/signin");
                }}
                className="text-xs text-muted-foreground hover:underline"
              >
                Log out
              </button>
            </div>
            <h1 className="font-headline text-xl font-bold text-foreground">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Interview decision report</p>
          </div>
        </div>

        {/* Verdict */}
        <section className="mb-16">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-center">
            {/* Left: orb */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full p-2 opacity-10" viewBox="0 0 320 320">
                  <circle
                    className="text-primary"
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
                    className="text-primary confidence-ring"
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
                  <span className="font-label mb-1 text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">
                    Verdict
                  </span>
                  <h2 className="font-headline text-4xl font-bold italic tracking-tight text-white drop-shadow-md md:text-5xl">
                    {verdictLabel}
                  </h2>
                </div>
                <div className="absolute -top-4 right-0 text-right">
                  <span className="font-label mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Confidence
                  </span>
                  {analysisState === "loading" ? (
                    <SkeletonLine className="ml-auto h-8 w-20" />
                  ) : (
                    <span className="font-label text-2xl font-bold text-primary">
                      {displayConfidencePct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-4 left-0 text-left">
                  <span className="font-label mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                    Report status
                  </span>
                  <span className="font-label text-xs uppercase tracking-widest text-muted-foreground">
                    Analysis complete · Final
                  </span>
                </div>
              </div>
            </div>

            {/* Right: narrative only */}
            <div className="flex flex-1 flex-col gap-4">
              <div className="glass-panel signal-glow rounded-r-xl border-l-4 border-primary p-6 text-left">
                <p className="font-label mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Reasoning
                </p>
                <p className="font-headline text-base leading-relaxed text-foreground/90 md:text-lg">
                  {narrativeText || "—"}
                </p>
              </div>

              {analysisState === "loading" && (
                <div className="space-y-2 text-left">
                  <SkeletonLine />
                  <SkeletonLine className="w-5/6" />
                </div>
              )}
              {analysisState === "error" && (
                <p className="text-sm text-muted-foreground">
                  AI recommendations are unavailable. The narrative above is from your generated
                  decision; rerun analysis after linking onboarding if needed.
                </p>
              )}
            </div>
          </div>

          {/* Next steps — full width below */}
          {analysisState === "ready" && analysisResult?.recommendation?.length ? (
            <div className="glass-panel mt-16 rounded-xl p-5 text-left">
              <p className="font-label mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Next steps
              </p>
              <ul className="space-y-2">
                {analysisResult.recommendation.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Top problem + landscape */}
        <div className="mb-14 grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <span className="font-label mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
              Primary friction
            </span>
            <h3 className="font-headline mb-6 text-2xl text-foreground md:text-3xl">Top problem</h3>
            {topCluster ? (
              <div className="space-y-6">
                <div className="group relative overflow-hidden rounded-lg border border-border/40 bg-card p-4 shadow-sm">
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-colors group-hover:bg-primary/10" />
                  <h4 className="font-label mb-3 text-xs font-bold uppercase tracking-widest text-primary">
                    {topCluster.category ? `${topCluster.category} · ` : ""}
                    Interview signal
                  </h4>
                  <p className="font-label mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    #1 Top Problem
                  </p>
                  <p className="font-headline text-lg font-semibold leading-snug text-foreground">
                    {topCluster.canonical_problem}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">{signalBadge()}</div>
                  <div className="relative mt-4 text-sm text-muted-foreground">{signalCardBody()}</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="font-label text-[10px] uppercase tracking-wide text-muted-foreground/80">
                      Evidence mix
                    </span>
                    <span className="font-label text-[10px] font-bold text-teal-700">
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
              <p className="text-sm text-muted-foreground">
                No clustered problem yet. Add interviews and rerun analysis.
              </p>
            )}
          </div>

          <div className="glass-panel md:col-span-5 rounded-xl border border-border/40 p-5">
            <span className="font-label mb-6 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Problem landscape
            </span>
            {landscapeItems.length > 0 ? (
              <div className="space-y-8">
                {landscapeItems.map((mc, i) => (
                  <div key={mc.id} className="flex gap-4">
                    <span className="font-label text-2xl font-bold text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h5 className="mb-1 text-sm font-bold uppercase tracking-tight text-foreground">
                        {mc.title}
                      </h5>
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{mc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No grouped themes yet.</p>
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
              <h3 className="font-headline text-2xl text-foreground md:text-3xl">
                Voice of the customer
              </h3>
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
                        className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20 p-8"
                      >
                        <span className="font-label mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {rankLabels[index]}
                        </span>
                        <span className="text-xs text-muted-foreground">No quote</span>
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
            <h3 className="font-headline text-2xl text-foreground md:text-3xl">
              Hypothesis vs reality
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              How your onboarding assumptions compare to what people said in interviews.
            </p>
          </div>
          {renderHypothesisSection()}
        </section>

        {/* What to build + flows */}
        <div className="mb-14 grid grid-cols-1 items-start gap-8 md:grid-cols-12">
          <div className="md:col-span-8">
            <h3 className="font-headline mb-8 text-2xl text-foreground md:text-3xl">What to build</h3>
            {sortedFeatures.length > 0 ? (
              <div className="space-y-4">
                {sortedFeatures.map((feature, index) => (
                  <div
                    key={`${feature.name}-${index}`}
                    className="group flex cursor-default items-center justify-between rounded-lg border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary transition-transform group-hover:scale-110">
                        {PRIORITY_ICONS[feature.priority]}
                      </span>
                      <div className="text-left">
                        <h4 className="text-sm font-bold uppercase tracking-wide text-foreground">
                          {feature.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-muted-foreground/30">chevron_right</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No feature specs in this decision.</p>
            )}
          </div>

          <div className="md:col-span-4">
            <h3 className="font-headline mb-8 text-2xl text-foreground md:text-3xl">User flows</h3>
            {flowTimeline.steps.length > 0 ? (
              <div>
                {flowTimeline.title && (
                  <p className="font-label mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {flowTimeline.title}
                  </p>
                )}
                <div className="relative space-y-12 border-l border-border/50 py-4 pl-8">
                  {flowTimeline.steps.map((step, i) => (
                    <div key={i} className="relative">
                      <div
                        className={`absolute -left-[37px] top-0 h-2 w-2 rounded-full ${
                          i === 0
                            ? "bg-primary signal-glow"
                            : i === 1
                              ? "bg-teal-600"
                              : "bg-muted-foreground/50"
                        }`}
                      />
                      <h5
                        className={`font-label mb-2 text-[10px] font-bold uppercase tracking-widest ${
                          i === 0 ? "text-primary" : i === 1 ? "text-teal-700" : "text-muted-foreground"
                        }`}
                      >
                        Step {i + 1}
                      </h5>
                      <p className="text-xs leading-relaxed text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No user flows in this decision.</p>
            )}
          </div>
        </div>

        {/* Edge cases + metrics */}
        <div className="mb-10 grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <h3 className="font-headline mb-8 text-2xl text-foreground md:text-3xl">Edge cases</h3>
            {edgeCases.length > 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
                <ul className="space-y-4">
                  {edgeCases.map((edge, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="material-symbols-outlined shrink-0 text-sm text-primary">
                        warning
                      </span>
                      <div>
                        <p className="text-sm text-foreground/90">{edge.scenario}</p>
                        {edge.mitigation && (
                          <p className="mt-1 text-xs text-muted-foreground">{edge.mitigation}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None listed.</p>
            )}
          </div>

          <div>
            <h3 className="font-headline mb-8 text-2xl text-foreground md:text-3xl">
              Success metrics
            </h3>
            {successMetrics.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {successMetrics.map((metric, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-white/50 bg-muted/50 p-4 text-center shadow-sm"
                  >
                    <p className="font-label mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {metric.metric}
                    </p>
                    <span className="text-xl font-bold text-teal-700 md:text-2xl">{metric.target}</span>
                    {metric.rationale && (
                      <p className="mt-2 text-left text-[11px] leading-snug text-muted-foreground">
                        {metric.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None listed.</p>
            )}
          </div>
        </div>

        <div className="mt-20 h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-40" />
        <footer className="flex flex-col gap-4 py-12 opacity-80 md:flex-row md:items-center md:justify-between">
          <span className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            Krowe · Interview decision · {projectId}
          </span>
          <div className="flex flex-wrap gap-4">
            <span className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
              Updated {formatDecisionTimestamp(decision.updated_at)}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

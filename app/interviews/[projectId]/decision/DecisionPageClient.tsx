"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { supabase } from "@/lib/supabaseClient";
import { ContentHeader } from "@/app/components/krowe/ContentHeader";
import { KroweLinkButton } from "@/app/components/krowe/KroweLinkButton";
import { KroweButton } from "@/app/components/krowe/KroweButton";
import { AllProblemsButton } from "./AllProblemsButton";
import type { AnalysisResponse } from "@/lib/analysis/hypothesisVsReality";
import type { ProblemCluster, FeatureSpec, DecisionOutput, MetaCluster } from "@/lib/interviews/types";
import "./decision-report.css";
import { KROWE_EASE } from "@/lib/motion/kroweEase";
import { getDashboardPageEntranceTiming } from "@/lib/motion/dashboardPageEntrance";
import { InterviewsPageWidth } from "@/app/interviews/_components/InterviewsPageWidth";

type ClusterWithId = ProblemCluster & { id: string };
type DecisionWithId = Omit<DecisionOutput, "project_id"> & {
  id: string;
  updated_at: string;
};

type ByTheNumbers = {
  interviewCount: number;
  highSignalCount: number;
  avgMinutes: number;
  minMinutes: number | null;
  maxMinutes: number | null;
  themeCount: number;
  dominantThemeCount: number;
  confidencePct: number;
};

type TimelineEvent = { at: string; label: string };

type Props = {
  projectId: string;
  project: { id: string; name: string };
  decision: DecisionWithId;
  topCluster: ClusterWithId | null;
  allClusters: ClusterWithId[];
  metaClusters: MetaCluster[];
  byTheNumbers: ByTheNumbers;
  sortedFeatures: FeatureSpec[];
  confidencePct: number;
  interviewsSortedIds: string[];
  persistedAnalysis: AnalysisResponse | null;
  synthesisDays: number | null;
  timelineEvents: TimelineEvent[];
};

const DECISION_LABELS: Record<AnalysisResponse["decision"], string> = {
  proceed: "Proceed",
  refine: "Refine",
  pivot: "Pivot",
  rethink: "Rethink",
};

const DECISION_COLORS: Record<string, string> = {
  Proceed: "#a04000",
  Refine: "#9a3412",
  Pivot: "#b91c1c",
  Rethink: "#7c3aed",
  Ready: "#000000",
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

const PRIORITY_CLASS: Record<FeatureSpec["priority"], string> = {
  "must-have": "dr-priority-p0",
  "should-have": "dr-priority-p1",
  "nice-to-have": "dr-priority-p2",
};

const PRIORITY_LABEL: Record<FeatureSpec["priority"], string> = {
  "must-have": "P0",
  "should-have": "P1",
  "nice-to-have": "P2",
};

const DECISION_HERO_HEADLINE = "Verdict, priorities, and interview signal in one report.";
const DECISION_HERO_SUBCOPY =
  "Scroll the editorial layout for build order, hypothesis checks, and quotes — confidence updates live when synthesis finishes.";

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getBuildTierClass(index: number): string {
  if (index <= 1) return "dr-build-tier-green";
  if (index <= 3) return "dr-build-tier-yellow";
  return "dr-build-tier-orange";
}

function deriveSignalLabel(score: number): "Strong" | "Moderate" | "Weak" {
  if (score >= 0.65) return "Strong";
  if (score >= 0.35) return "Moderate";
  return "Weak";
}

function parseRationaleItem(s: string, fallbackIndex: number): { title: string; body: string } {
  const emIdx = s.indexOf(" \u2014 ");
  if (emIdx > 0) return { title: s.slice(0, emIdx).trim(), body: s.slice(emIdx + 3).trim() };
  const colonIdx = s.indexOf(": ");
  if (colonIdx > 0 && colonIdx < 40) return { title: s.slice(0, colonIdx).trim(), body: s.slice(colonIdx + 2).trim() };
  const words = s.split(" ");
  if (words.length > 6) {
    return { title: words.slice(0, 4).join(" "), body: words.slice(4).join(" ") };
  }
  return { title: `Point ${fallbackIndex + 1}`, body: s };
}

type FeatureWithReason = { name: string; reason: string };

function normalizeFeatureEntry(
  item: string | { name?: string; reason?: string }
): FeatureWithReason {
  if (typeof item === "string") return { name: item, reason: "" };
  return { name: item.name ?? "", reason: item.reason ?? "" };
}

function sanitizeReasoningString(s: string): string {
  return s
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

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
        // fall through
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
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded ${className ?? "h-4 w-full"}`} />;
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <p className="dr-eyebrow" style={color ? { color } : undefined}>
      {children}
    </p>
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
    return "dr-impact-fill";
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
              className={`h-full rounded-full transition-all ${barClass(b.tone)}`}
              style={{ width: `${Math.min(100, b.pct)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Tile({
  eyebrow,
  value,
  caption,
  valueAccent,
}: {
  eyebrow: string;
  value: string;
  caption: string;
  valueAccent?: boolean;
}) {
  return (
    <div className="dr-btn-tile">
      <p className="dr-eyebrow">{eyebrow}</p>
      <p className={`dr-btn-value${valueAccent ? " dr-btn-value-accent" : ""}`}>{value}</p>
      <p className="dr-btn-caption">{caption}</p>
    </div>
  );
}

function VoiceQuoteCard({
  quote,
  interviewLabel,
  rankLabel,
  isParaphrased,
  isBrand,
}: {
  quote: ProblemCluster["supporting_quotes"][number];
  interviewLabel: string;
  rankLabel?: string;
  isParaphrased?: boolean;
  isBrand?: boolean;
}) {
  return (
    <div className={`dr-quote-card ${isBrand ? "dr-quote-brand" : ""}`}>
      <span className="dr-quote-icon material-symbols-outlined mb-3 block">format_quote</span>
      {rankLabel && (
        <p className="dr-eyebrow mb-2" style={isBrand ? { color: "#ff7a00" } : undefined}>{rankLabel}</p>
      )}
      <p className="dr-body-text text-sm leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-2 border-t pt-3" style={{ borderColor: "#ededed" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#f2f2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="font-label text-[10px]">#</span>
        </div>
        <span className="font-label text-[10px] font-bold uppercase tracking-widest">
          {interviewLabel}
        </span>
      </div>
      {isParaphrased && (
        <span className="dr-body-text mt-1 block text-[10px] uppercase tracking-wide opacity-80">
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
  byTheNumbers,
  sortedFeatures,
  confidencePct,
  interviewsSortedIds,
  persistedAnalysis,
  synthesisDays,
  timelineEvents,
}: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [analysisState, setAnalysisState] = useState<"loading" | "error" | "ready">(
    persistedAnalysis ? "ready" : "loading"
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(persistedAnalysis);
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
      const reach = m.interviewCount > 0 ? (m.uniqueInterviewees / m.interviewCount) * 100 : 0;
      return [
        { label: "Reach", pct: reach, tone: "tertiary" as const },
        { label: "Consistency", pct: m.consistencyScore * 100, tone: "primarySoft" as const },
        { label: "Intensity", pct: (m.avgIntensity / 5) * 100, tone: "primary" as const },
      ];
    }

    return [
      { label: "Reach", pct: Math.min(100, (topCluster.frequency / 10) * 100), tone: "tertiary" },
      { label: "Consistency", pct: topCluster.consistency_score * 100, tone: "primarySoft" },
      { label: "Intensity", pct: (topCluster.avg_intensity / 5) * 100, tone: "primary" },
    ];
  }, [topCluster, analysisState, analysisResult]);

  const landscapeItems = useMemo(
    () => [...metaClusters].sort((a, b) => b.score - a.score).slice(0, 3),
    [metaClusters]
  );

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
    if (persistedAnalysis) return;

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    setAnalysisResult(null);
    setAnalysisError("");
    setAnalysisState("loading");

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
        setAnalysisError(err instanceof Error ? err.message : "Unknown error");
        setAnalysisState("error");
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
    if (analysisState === "loading") return <SkeletonLine className="h-16 w-full" />;
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
            <div key={card} className="dr-card overflow-hidden">
              <div className="border-b px-5 py-3" style={{ borderColor: "#ededed" }}>
                <SkeletonLine className="h-3 w-32" />
              </div>
              <div className="grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0"
                style={{ borderColor: "#ededed" }}>
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
        <div className="dr-card flex flex-col gap-3 p-6">
          <p className="text-sm text-danger">
            {analysisError === "No onboarding data linked"
              ? "No onboarding data linked to this project."
              : "Hypothesis comparison unavailable. Your interview-backed sections below are still valid."}
          </p>
          <p className="text-xs dr-body-text">{analysisError}</p>
          <div>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{ background: "#ff7a00" }}
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
            <div key={card} className="dr-card overflow-hidden">
              <div className="border-b px-5 py-3" style={{ borderColor: "#ededed" }}>
                <SkeletonLine className="h-3 w-32" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x"
                style={{ borderColor: "#ededed" }}>
                <div className="space-y-2 p-8"><SkeletonLine /><SkeletonLine className="h-4 w-4/5" /></div>
                <div className="space-y-2 p-8"><SkeletonLine /><SkeletonLine className="h-4 w-4/5" /></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const { breakdown, context } = analysisResult;

    const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0] ?? text;

    const HvRRow = ({
      title,
      badge,
      hypothesis,
      reality,
      status,
    }: {
      title: string;
      badge?: ReactNode;
      hypothesis: ReactNode;
      reality: ReactNode;
      status: "fit" | "partial" | "mismatch" | "neutral";
    }) => {
      const iconConfig = {
        fit:      { bg: "#e6f7ed", color: "#1d8045", icon: "check" },
        partial:  { bg: "#fff4d6", color: "#a07a00", icon: "remove" },
        mismatch: { bg: "#ffe4e6", color: "#b91c1c", icon: "close" },
        neutral:  { bg: "#f2f2f2", color: "#757575", icon: "analytics" },
      }[status];

      const realityEyebrowColor = {
        fit: "#1d8045",
        partial: "#a07a00",
        mismatch: "#b91c1c",
        neutral: undefined as string | undefined,
      }[status];

      const realityPanelClass =
        status === "fit" ? "dr-hvr-panel dr-hvr-panel--fit"
        : status === "partial" ? "dr-hvr-panel dr-hvr-panel--partial"
        : status === "mismatch" ? "dr-hvr-panel dr-hvr-panel--mismatch"
        : "dr-hvr-panel";

      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 px-1 mb-3">
            <Eyebrow>{title}</Eyebrow>
            {badge}
          </div>
          <div className="dr-hvr-grid">
            <div className="dr-hvr-panel">
              <Eyebrow>Your hypothesis</Eyebrow>
              <div className="mt-3 text-[15px] font-medium leading-relaxed dr-body-text">
                {hypothesis}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: iconConfig.bg,
                  color: iconConfig.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {iconConfig.icon}
                </span>
              </div>
            </div>
            <div className={realityPanelClass}>
              <Eyebrow color={realityEyebrowColor}>
                What interviews support
              </Eyebrow>
              <div className="mt-3 text-[15px] font-medium leading-relaxed dr-body-text">
                {reality}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const problemRight = (
      <p className="dr-body-text text-[15px] font-medium leading-relaxed not-italic">
        {breakdown.problemMatch.realitySummary || firstSentence(context.topProblem) || "—"}
      </p>
    );

    const customerRight = (
      <p className="dr-body-text text-[15px] font-medium leading-relaxed not-italic">
        {breakdown.customerAlignment.realitySummary || firstSentence(context.customerInsight) || "—"}
      </p>
    );


    const problemFitStatus: "fit" | "partial" | "mismatch" =
      breakdown.problemMatch.status === "strong_match" ? "fit"
      : breakdown.problemMatch.status === "partial_match" ? "partial"
      : "mismatch";

    const customerFitStatus: "fit" | "partial" | "mismatch" =
      breakdown.customerAlignment.status === "aligned" ? "fit"
      : breakdown.customerAlignment.status === "partially_aligned" ? "partial"
      : "mismatch";

    const relevantNorm = (breakdown.featureRelevance.relevant as Array<string | FeatureWithReason>).map(normalizeFeatureEntry);
    const unnecessaryNorm = (breakdown.featureRelevance.unnecessary as Array<string | FeatureWithReason>).map(normalizeFeatureEntry);
    const { missing } = breakdown.featureRelevance;
    const relevant = relevantNorm.map((e) => e.name);
    const unnecessary = unnecessaryNorm.map((e) => e.name);
    const solutionScore = relevant.length - missing.length - unnecessary.length;
    const solutionFitStatus: "fit" | "partial" | "mismatch" =
      solutionScore >= 2 && relevant.length >= 2 ? "fit"
      : solutionScore >= 0 || relevant.length >= 1 ? "partial"
      : "mismatch";

    return (
      <div className="space-y-8">
        <HvRRow
          title="Problem fit"
          badge={
            <StatusBadge
              label={MATCH_STATUS_LABELS[breakdown.problemMatch.status]}
              className={MATCH_STATUS_STYLES[breakdown.problemMatch.status]}
            />
          }
          hypothesis={
            <span>
              {breakdown.problemMatch.hypothesisSummary || firstSentence(context.founderProblem) || "—"}
            </span>
          }
          reality={problemRight}
          status={problemFitStatus}
        />
        <HvRRow
          title="Customer fit"
          badge={
            <StatusBadge
              label={ALIGNMENT_STATUS_LABELS[breakdown.customerAlignment.status]}
              className={ALIGNMENT_STATUS_STYLES[breakdown.customerAlignment.status]}
            />
          }
          hypothesis={
            <span>
              {breakdown.customerAlignment.hypothesisSummary || firstSentence(context.founderCustomer) || "—"}
            </span>
          }
          reality={customerRight}
          status={customerFitStatus}
        />
        {/* ── Solution Fit (redesigned) ── */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 px-1 mb-3">
            <Eyebrow>Solution fit</Eyebrow>
            <span className={`dr-sf-coverage-badge dr-sf-coverage-badge--${
              solutionFitStatus === "fit" ? "fit"
              : solutionFitStatus === "mismatch" ? "mismatch"
              : "partial"
            }`}>
              {solutionFitStatus === "fit" ? "Fit"
                : solutionFitStatus === "mismatch" ? "Mismatch"
                : "Partial coverage"}
            </span>
          </div>

          <div className="dr-sf-card">
            {/* Summary tiles */}
            <div className="dr-sf-tiles">
              <div className="dr-sf-tile">
                <span className="dr-sf-tile-num" style={{ color: "#1d8045" }}>{relevant.length}</span>
                <p className="dr-eyebrow mt-1">Supported</p>
                <p className="dr-btn-caption">Interviews validate this feature</p>
              </div>
              <div className="dr-sf-tile dr-sf-tile--mid">
                <span className="dr-sf-tile-num" style={{ color: "var(--dr-bullet)" }}>{missing.length}</span>
                <p className="dr-eyebrow mt-1">Gaps added</p>
                <p className="dr-btn-caption">Missing from plan, raised by users</p>
              </div>
              <div className="dr-sf-tile">
                <span className="dr-sf-tile-num" style={{ color: "#757575" }}>{unnecessary.length}</span>
                <p className="dr-eyebrow mt-1">Deprioritize</p>
                <p className="dr-btn-caption">Weak signal or low pain</p>
              </div>
            </div>

            {/* Feature → interviews table */}
            {context.founderFeatures.length > 0 ? (
              <>
                <div className="dr-sf-table-header">
                  Your feature → What interviews said
                </div>
                {context.founderFeatures.map((feature, idx) => {
                  const norm = (s: string) => s.toLowerCase().trim();
                  const matches = (a: string, b: string) => {
                    const na = norm(a), nb = norm(b);
                    return na === nb || na.includes(nb) || nb.includes(na);
                  };
                  const kind = relevant.some(r => matches(r, feature)) ? "supported"
                    : unnecessary.some(u => matches(u, feature)) ? "deprioritize"
                    : "gap";
                  return (
                    <div key={idx} className={`dr-sf-row${kind === "deprioritize" ? " dr-sf-row--deprioritize" : ""}`}>
                      <div className="dr-sf-row-icon">
                        {kind === "supported" && (
                          <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#e6f7ed", color: "#1d8045", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                          </span>
                        )}
                        {kind === "gap" && (
                          <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff8ec", color: "var(--dr-bullet)", border: "1.5px solid #f5d3a0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                          </span>
                        )}
                        {kind === "deprioritize" && (
                          <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#f2f2f2", color: "#757575", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>remove</span>
                          </span>
                        )}
                      </div>
                      <div className="dr-sf-row-label">{feature}</div>
                      <div className="dr-sf-row-right">
                        <span className={`dr-sf-pill dr-sf-pill--${kind}`}>
                          {kind === "supported" ? "Supported"
                            : kind === "deprioritize" ? "Deprioritize"
                            : "Gap"}
                        </span>
                        {kind === "supported" && (() => {
                          const entry = relevantNorm.find((e) => matches(e.name, feature));
                          const reason = entry?.reason || "Interviews confirm this is a real pain point users want solved.";
                          return <p className="dr-sf-row-reason">{reason}</p>;
                        })()}
                        {kind === "deprioritize" && (() => {
                          const entry = unnecessaryNorm.find((e) => matches(e.name, feature));
                          const reason = entry?.reason || "Low signal — users didn\u2019t raise this or found workarounds easily.";
                          return <p className="dr-sf-row-reason">{reason}</p>;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="px-6 py-4 dr-body-text text-sm">No features listed</p>
            )}

            {/* Added from interviews footer */}
            {missing.length > 0 && (
              <div className="dr-sf-footer">
                <div className="dr-sf-footer-header">
                  + Added from interviews · Not in your plan
                </div>
                <ul className="dr-sf-footer-list">
                  {missing.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const verdictLabel = analysisResult?.decision ? DECISION_LABELS[analysisResult.decision] : "Ready";
  const verdictColor = DECISION_COLORS[verdictLabel] ?? "#000000";
  const ringArc = `conic-gradient(#ff7a00 0 ${ringPercent}%, #f0f0f0 ${ringPercent}% 100%)`;

  const heroWords = DECISION_HERO_HEADLINE.split(" ");
  const { clipStart, perWordDelay, clipDuration, supportingDelay, buttonsDelay, overviewBlockDelay } =
    getDashboardPageEntranceTiming(heroWords.length);

  const scrollToDecisionMain = () => {
    document.getElementById("decision-report-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const decisionHeader = (
    <ContentHeader
      breadcrumbs={[
        { label: "Interviews", href: "/interviews" },
        { label: project.name, href: `/interviews/${projectId}` },
        { label: "Decision" },
      ]}
      title="Decision report"
      description={`Verdict, build priorities, and interview-grounded rationale for ${project.name}.`}
      actions={
        <>
          <KroweLinkButton href={`/interviews/${projectId}`} variant="secondary">
            Workspace
          </KroweLinkButton>
          <KroweButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/auth/signin");
            }}
          >
            Log out
          </KroweButton>
        </>
      }
    />
  );


  return (
    <div className="krowe-blueprint-canvas -mx-3 -mt-3 min-h-[calc(100vh-6rem)] rounded-none px-3 pb-10 pt-3 sm:-mx-4 sm:px-4">
      <InterviewsPageWidth className="relative z-10 px-4 py-6 sm:px-6 sm:py-8">
        {reduceMotion ? (
          decisionHeader
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: KROWE_EASE }}
          >
            {decisionHeader}
          </motion.div>
        )}

        {!reduceMotion ? (
          <div className="relative mb-8 overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-gradient-to-br from-primary-soft via-background to-card shadow-[var(--shadow-1)]">
            <div
              className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse at 80% 40%, color-mix(in oklch, var(--primary) 18%, transparent) 0%, transparent 72%)",
              }}
            />
            <div className="relative px-6 py-8 sm:px-8 sm:py-10">
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.03, ease: KROWE_EASE }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-semibold text-primary shadow-[var(--shadow-1)] backdrop-blur-sm"
              >
                <SparklesIcon size={14} className="shrink-0" aria-hidden />
                Decision intelligence
              </motion.span>

              <h2 className="krowe-display-m mt-4 max-w-3xl text-pretty text-foreground">
                {heroWords.map((word, i) => {
                  const isAccent = i === heroWords.length - 1;
                  return (
                    <motion.span
                      key={`${word}-${i}`}
                      initial={{ clipPath: "inset(0 100% 0 0)", opacity: 1 }}
                      animate={{ clipPath: "inset(0 0% 0 0)" }}
                      transition={{
                        delay: clipStart + i * perWordDelay,
                        duration: clipDuration,
                        ease: KROWE_EASE,
                      }}
                      className={isAccent ? "text-primary" : undefined}
                      style={{ display: "inline-block", marginRight: "0.28em" }}
                    >
                      {word}
                    </motion.span>
                  );
                })}
              </h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: supportingDelay, duration: 0.26, ease: KROWE_EASE }}
                className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground"
              >
                {DECISION_HERO_SUBCOPY}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: buttonsDelay, duration: 0.24, ease: KROWE_EASE }}
                className="mt-6 flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={scrollToDecisionMain}
                  className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-4)] transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-smooth)] hover:-translate-y-px active:translate-y-px"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Jump to report
                </button>
                <KroweLinkButton href={`/interviews/${projectId}`} variant="secondary">
                  Workspace
                </KroweLinkButton>
              </motion.div>
            </div>
          </div>
        ) : null}

        <motion.div
          id="decision-report-main"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : { delay: overviewBlockDelay + 0.08, duration: 0.28, ease: KROWE_EASE }
          }
        >
        <main className="decision-report font-sans relative rounded-[var(--radius-lg)] border border-border/60 bg-background shadow-[var(--shadow-1)]">
          <div className="px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Verdict hero card ── */}
        <section className="mb-10">
          <div
            className="dr-card p-8"
            style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "center" }}
          >
            {/* Conic-gradient confidence ring */}
            <div
              style={{
                position: "relative",
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: ringArc,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.35), 0 12px 36px -10px rgba(255, 122, 0, 0.22)",
                flexShrink: 0,
              }}
            >
              <div
                className="dr-verdict-inner"
                style={{ width: 144, height: 144 }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#757575",
                  }}
                >
                  Confidence
                </span>
                {analysisState === "loading" ? (
                  <SkeletonLine className="mt-1 h-10 w-16" />
                ) : (
                  <span
                    className="font-headline"
                    style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, marginTop: 2 }}
                  >
                    {Math.round(displayConfidencePct)}
                  </span>
                )}
                <span style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>
                  {displayConfidencePct >= 65 ? "high" : "moderate"}
                </span>
              </div>
            </div>

            {/* Verdict + reasoning */}
            <div>
              <Eyebrow>Verdict</Eyebrow>
              <h1
                className="font-headline"
                style={{ fontSize: 48, lineHeight: 1, color: verdictColor, margin: "6px 0 16px 0" }}
              >
                {verdictLabel}
              </h1>

              {analysisState === "loading" && (
                <div className="space-y-2">
                  <SkeletonLine />
                  <SkeletonLine className="w-5/6" />
                  <SkeletonLine className="w-4/6" />
                </div>
              )}

              {analysisState === "error" && (
                <p className="dr-body-text text-sm">
                  AI recommendations unavailable. Reasoning above is from your generated decision.
                </p>
              )}

              {(analysisState === "ready" || reasoningDisplayItems.length > 0) && (
                <>
                  <p style={{ margin: "0 0 14px 0", fontSize: 14, color: "#666666", lineHeight: 1.6 }}>
                    {reasoningDisplayItems.join(" ")}
                  </p>
                  <div className="dr-tags-row">
                    <span className="dr-tag dr-tag--warm">{project.name}</span>
                    {interviewsSortedIds.length > 0 && (
                      <span className="dr-tag dr-tag--neutral">{interviewsSortedIds.length} interviews</span>
                    )}
                    {synthesisDays != null && synthesisDays > 0 && (
                      <span className="dr-tag dr-tag--neutral">{synthesisDays} days of synthesis</span>
                    )}
                    <span className="dr-tag dr-tag--complete">
                      <span className="dr-tag-dot" />
                      Report complete
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Rationale */}
          {analysisState === "ready" && analysisResult?.recommendation?.length ? (
            <div className="mt-8">
              <Eyebrow>What to do next</Eyebrow>
              <h2
                className="font-headline"
                style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 20px" }}
              >
                Next Steps
              </h2>
              <div className="space-y-3">
                {analysisResult.recommendation.map((rec, index) => {
                  const { title, body } = parseRationaleItem(rec, index);
                  return (
                    <div key={index} className="dr-rationale-card">
                      <span className="dr-rationale-card-num">{index + 1}</span>
                      <div className="dr-rationale-card-body">
                        <p className="dr-rationale-card-title">{title}</p>
                        <p className="dr-rationale-card-desc">{body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {/* ── Top problem + Landscape ── */}
        <section className="mb-10">
          <Eyebrow color="#a04000">Primary friction</Eyebrow>
          <div className="mt-4">
            {topCluster ? (
              <div className="dr-card overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] md:divide-x md:divide-[#ededed]">
                  {/* Left: problem signal */}
                  <div className="border-b p-6 md:border-b-0 md:border-r" style={{ borderColor: "#ededed" }}>
                    <Eyebrow color="#a04000">
                      {topCluster.category ? `${topCluster.category} · ` : ""}Interview signal
                    </Eyebrow>
                    <p className="font-headline mt-3 text-xl font-semibold leading-snug">
                      {topCluster.canonical_problem}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {signalBadge()}
                      {topCluster.consistency_score > 0 && (
                        <StatusBadge
                          label={`${Math.round(topCluster.consistency_score * 100)}% coverage`}
                          className="border-[#f5d3a0] bg-[#fff8ec] text-[#a04000]"
                        />
                      )}
                    </div>
                    <div className="mt-3 text-sm">{signalCardBody()}</div>
                  </div>

                  {/* Right: evidence mix + problem landscape */}
                  <div className="flex flex-col gap-5 p-6">
                    {/* Evidence mix */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <Eyebrow>Evidence mix</Eyebrow>
                        <span className="font-label flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "#ff7a00" }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff7a00]" />
                          {analysisState === "ready" ? "Live" : analysisState === "loading" ? "…" : "Partial"}
                        </span>
                      </div>
                      <ImpactDistribution
                        bars={impactBars ?? []}
                        loading={analysisState === "loading" || impactBars === null}
                      />
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: "#ededed" }} />

                    {/* Problem landscape */}
                    <div>
                      <Eyebrow>Problem landscape</Eyebrow>
                      {landscapeItems.length > 0 ? (
                        <div className="mt-4 space-y-4">
                          {landscapeItems.map((mc, i) => (
                            <div key={mc.id} className="flex gap-3">
                              <span
                                className="font-headline shrink-0 text-lg font-bold leading-none"
                                style={{ color: "#ff7a00" }}
                              >
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <h5 className="font-label line-clamp-1 text-[10px] font-bold uppercase tracking-tight" style={{ color: "#000000" }}>
                                  {mc.title}
                                </h5>
                                <p className="dr-body-text mt-0.5 line-clamp-2 text-xs leading-relaxed">
                                  {mc.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="dr-body-text mt-3 text-xs">No grouped themes yet.</p>
                      )}
                      {allClusters.length > 0 && (
                        <div className="mt-4 flex justify-end">
                          <AllProblemsButton allClusters={allClusters} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="dr-body-text text-sm">
                No clustered problem yet. Add interviews and rerun analysis.
              </p>
            )}
          </div>
        </section>

        {/* ── Voice of the customer ── */}
        {topCluster && (
          <section className="mb-10">
            <div className="mb-6 text-center">
              <h3 className="font-headline text-2xl">Voice of the customer</h3>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {(() => {
                const rankLabels = ["Strongest evidence", "Moderate evidence", "Weakest evidence"];
                const quotes = [...topCluster.supporting_quotes.slice(0, 3)];
                return [0, 1, 2].map((index) => {
                  const quote = quotes[index];
                  if (!quote) {
                    return (
                      <div
                        key={index}
                        className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed p-8"
                        style={{ borderColor: "#ededed", background: "#f9f9f9" }}
                      >
                        <Eyebrow>{rankLabels[index]}</Eyebrow>
                        <span className="dr-body-text mt-2 text-xs">No quote</span>
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
                      isBrand={index === 0}
                    />
                  );
                });
              })()}
            </div>
          </section>
        )}

        {/* ── Hypothesis vs reality ── */}
        <section className="mb-10">
          <div className="mb-6">
            <Eyebrow>Hypothesis vs reality</Eyebrow>
            <h3 className="font-headline mt-2 text-3xl font-bold">What we got right — and wrong</h3>
          </div>
          {renderHypothesisSection()}
        </section>

        {/* ── What to build ── */}
        <div className="mb-10">
          <h3 className="font-headline mb-6 text-2xl">What to build</h3>
          {sortedFeatures.length > 0 ? (
            <div className="flex flex-col gap-3">
              {sortedFeatures.map((feature, index) => (
                <div
                  key={`${feature.name}-${index}`}
                  className={`dr-build-card ${getBuildTierClass(index)}`}
                >
                  <span className={PRIORITY_CLASS[feature.priority]}>
                    {PRIORITY_LABEL[feature.priority]}
                  </span>
                  <span
                    className={`material-symbols-outlined dr-build-icon transition-transform`}
                    aria-hidden
                  >
                    {PRIORITY_ICONS[feature.priority]}
                  </span>
                  <div className="flex-1">
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#000000" }}>
                      {feature.name}
                    </p>
                    <p className="dr-body-text" style={{ margin: "2px 0 0 0", fontSize: 12.5 }}>
                      {feature.description}
                    </p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: "#a3a3a3", fontSize: 18 }} aria-hidden>
                    chevron_right
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="dr-body-text text-sm">No feature specs in this decision.</p>
          )}
        </div>

        {/* ── Timeline + By the numbers ── */}
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Timeline</Eyebrow>
            <h3 className="font-headline mb-5 mt-1 text-2xl">
              {synthesisDays != null && synthesisDays > 0
                ? `${synthesisDays} days of synthesis`
                : "Synthesis timeline"}
            </h3>
            <div className="dr-card p-5">
              <div
                className="relative space-y-6 border-l py-2 pl-7"
                style={{ borderColor: "#e5e5e5" }}
              >
                {timelineEvents.map((event, i) => (
                  <div key={i} className="relative flex items-start gap-4">
                    <div
                      className="dr-flow-node absolute -left-[33px] top-1.5 h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--dr-bullet)" }}
                    />
                    <p
                      className="font-label w-14 shrink-0 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--dr-body-muted)" }}
                    >
                      {formatShortDate(event.at)}
                    </p>
                    <p className="dr-body-text text-sm leading-relaxed">{event.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Eyebrow>Metrics</Eyebrow>
            <h3 className="font-headline mb-5 mt-1 text-2xl">By the numbers</h3>
            <div className="dr-card p-5">
              <div className="dr-btn-grid">
                <Tile
                  eyebrow="Interviews"
                  value={String(byTheNumbers.interviewCount)}
                  caption={`${byTheNumbers.highSignalCount} high signal`}
                />
                <Tile
                  eyebrow="Avg length"
                  value={byTheNumbers.avgMinutes > 0 ? `${byTheNumbers.avgMinutes}m` : "—"}
                  caption={
                    byTheNumbers.minMinutes != null
                      ? `min ${byTheNumbers.minMinutes} · max ${byTheNumbers.maxMinutes}`
                      : "No transcripts"
                  }
                />
                <Tile
                  eyebrow="Themes"
                  value={String(byTheNumbers.themeCount)}
                  caption={`${byTheNumbers.dominantThemeCount} dominant`}
                  valueAccent
                />
                <Tile
                  eyebrow="Confidence"
                  value={`${Math.round(byTheNumbers.confidencePct)}%`}
                  caption="above 65 threshold"
                  valueAccent
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="mt-16 h-px w-full"
          style={{ background: "linear-gradient(to right, transparent, #ededed, transparent)" }}
        />
        <footer className="flex flex-col gap-3 py-10 md:flex-row md:items-center md:justify-between">
          <span className="font-label text-[9px] uppercase tracking-[0.3em]">
            Krowe · Interview decision · {projectId}
          </span>
          <span className="font-label text-[9px] uppercase tracking-[0.3em]">
            Updated {formatDecisionTimestamp(decision.updated_at)}
          </span>
        </footer>
          </div>
        </main>
        </motion.div>
      </InterviewsPageWidth>
    </div>
  );
}

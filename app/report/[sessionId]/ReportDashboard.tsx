"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  Clock,
  DollarSign,
  Users,
  Zap,
  Target,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatUsdRange,
  formatPlanningYear1,
  formatMvpCostRange,
  parseMvpScopeList,
} from "@/lib/report/formatReportForUI";
import { ProgressScreen } from "./ProgressScreen";
import { ContinueToDashboardButton } from "./ContinueToDashboardButton";

// Minimal type for report payload the Dashboard expects (matches stored report.data)
interface ReportDataForUI {
  inputsSnapshot?: {
    idea?: string | null;
    productType?: string | null;
    targetCustomer?: string | null;
    industry?: string | null;
    age?: number | null;
    hours?: number | null;
    teamSize?: number | null;
    skillsRaw?: string | null;
    problem?: string | null;
  };
  timeToMvp?: { label?: string; rationale?: string; lowWeeks?: number; highWeeks?: number };
  founderFit?: {
    score: number;
    category: string;
    components: { skill: number; age: number; cost: number; industry: number };
  };
  startupAdvantage?: {
    score: number;
    components: {
      skill: number;
      age: number;
      costEff: number;
      productType: number;
      industry: number;
    };
  };
  mvpCostEstimate?: {
    cost_low_usd: number;
    cost_high_usd: number;
    cost_efficiency_score_0_1: number;
    confidence_0_1: number;
    recommended_mvp_scope?: string;
  } | null;
  costEstimate?: {
    cost_low_usd: number;
    cost_high_usd: number;
    cost_efficiency_score_0_1: number;
    confidence_0_1: number;
    recommended_mvp_scope?: string;
  } | null;
  marketSize?: {
    planning_market_size_usd_range?: { low: number; high: number };
    planning_year_1?: { target_revenue_usd?: { low: number; high: number } };
    tam_usd_range?: { low: number; high: number };
    sam_usd_range?: { low: number; high: number };
    initial_wedge_usd_range?: { low: number; high: number };
    wedge_sam_usd_range?: { low: number; high: number };
  } | null;
  competitors?: Array<{ name: string; url?: string; evidence?: string; why_competitor?: string }>;
  thingsNeed?: { needs: Array<{ title: string; why?: string }> };
  skills?: {
    overall: number | null;
    profile: {
      development: string;
      marketing: string;
      leadership: string;
    };
  };
  industryResult?: {
    level: string;
    score: number | null;
    evidence: string[];
  };
}

export interface ReportDashboardProps {
  report: { data?: ReportDataForUI; markdown?: string };
  status?: string;
  /** When set with `platformBaseUrl`, shows “Continue to dashboard” next to the report title. */
  sessionId?: string;
  platformBaseUrl?: string;
}

function Tooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 text-center z-50 pointer-events-none">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

function ScoreRing({
  score,
  max = 100,
  size = 80,
  strokeWidth = 6,
}: {
  score: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeScore = Number(score);
  const percentage = Number.isFinite(safeScore) ? (safeScore / max) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(210 ${size / 2} ${size / 2})`}
          className="text-orange-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold text-black">{Number.isFinite(safeScore) ? safeScore : "—"}</span>
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  max = 100,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const percentage = (value / max) * 100;
  return (
    <div className={cn("h-1.5 bg-gray-200 rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-orange-500 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
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
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all hover:border-orange-500 hover:shadow-md",
        accent && "border-t-2 border-t-orange-500",
        className
      )}
    >
      {children}
    </div>
  );
}

function ExpandableText({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncated = text.length > 60 ? text.slice(0, 60) + "..." : text;

  return (
    <div className="text-sm">
      <span className="text-gray-600">{label}: </span>
      <span className="text-black">{expanded ? text : truncated}</span>
      {text.length > 60 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="ml-2 text-orange-500 text-xs font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
}

export function ReportDashboard({
  report,
  status,
  sessionId,
  platformBaseUrl,
}: ReportDashboardProps) {
  const router = useRouter();
  const data = report?.data;

  useEffect(() => {
    if (status !== "processing") return;

    const poll = window.setInterval(() => {
      router.refresh();
    }, 2500);

    return () => window.clearInterval(poll);
  }, [status, router]);

  if (status !== "ready" || !data) {
    if (status === "processing") {
      return <ProgressScreen />;
    }

    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-gray-600">Report not available.</p>
        </div>
      </main>
    );
  }

  const inputs = data.inputsSnapshot ?? {};
  const marketSize = data.marketSize ?? null;
  const timeToMvp = data.timeToMvp;
  const mvpCost = data.mvpCostEstimate ?? data.costEstimate ?? null;
  const founderFit = data.founderFit;
  const startupAdvantage = data.startupAdvantage;
  const competitors = data.competitors ?? [];
  const thingsNeed = data.thingsNeed?.needs ?? [];
  const skills = data.skills;
  const industryResult = data.industryResult;

  // Time-to-MVP progress: longer weeks = lower bar (inverse of "readiness")
  const timeProgress =
    timeToMvp?.lowWeeks != null
      ? Math.max(0, 100 - (timeToMvp.lowWeeks / 24) * 80)
      : 35;

  const mvpScopeList = mvpCost?.recommended_mvp_scope
    ? parseMvpScopeList(mvpCost.recommended_mvp_scope)
    : [];

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-black tracking-tight">
              Krowe Pre-Seed Advisor Report
            </h1>
            <p className="text-gray-600 mt-1">Startup readiness analysis</p>
          </div>
          {platformBaseUrl && sessionId ? (
            <div className="shrink-0 sm:pt-0.5">
              <ContinueToDashboardButton
                sessionId={sessionId}
                platformBaseUrl={platformBaseUrl}
              />
            </div>
          ) : null}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          {/* CARD A - Market Size (Hero) */}
          <DashboardCard className="lg:col-span-7 row-span-2" accent>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-black">Market Size</h2>
                  <Tooltip content="Estimated market sizes for planning, TAM, SAM, and initial wedge.">
                    <button
                      type="button"
                      className="text-gray-500 hover:text-black transition-colors"
                      aria-label="Market definition info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  {inputs.industry ?? "—"}
                </p>
              </div>
              <Target className="w-5 h-5 text-orange-500" />
            </div>

            <div className="mb-8">
              <p className="text-sm text-gray-600 mb-1">Planning Market Size</p>
              <p className="text-5xl md:text-6xl font-bold text-black tracking-tight">
                {marketSize
                  ? formatPlanningYear1({
                      planning_market_size_usd_range:
                        marketSize.planning_market_size_usd_range,
                      target_revenue_usd:
                        marketSize.planning_year_1?.target_revenue_usd,
                    })
                  : "—"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">TAM</p>
                <p className="text-lg font-semibold text-black">
                  {marketSize ? formatUsdRange(marketSize.tam_usd_range) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">SAM</p>
                <p className="text-lg font-semibold text-black">
                  {marketSize ? formatUsdRange(marketSize.sam_usd_range) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Initial Wedge</p>
                <p className="text-lg font-semibold text-black">
                  {marketSize
                    ? formatUsdRange(
                        marketSize.initial_wedge_usd_range ??
                          marketSize.wedge_sam_usd_range
                      )
                    : "—"}
                </p>
              </div>
            </div>
          </DashboardCard>

          {/* CARD B - Time to MVP */}
          <DashboardCard className="lg:col-span-5">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">Time to MVP</h2>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-2">
              {timeToMvp?.label ?? "—"}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {timeToMvp?.rationale ?? "—"}
            </p>
            <ProgressBar value={timeProgress} className="mt-auto" />
          </DashboardCard>

          {/* CARD C - MVP Cost */}
          <DashboardCard className="lg:col-span-5">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">MVP Cost</h2>
              <DollarSign className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-3">
              {mvpCost
                ? formatMvpCostRange(mvpCost.cost_low_usd, mvpCost.cost_high_usd)
                : "—"}
            </p>
            {mvpCost && (
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-gray-600">Cost efficiency</p>
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      value={Math.round(mvpCost.cost_efficiency_score_0_1 * 100)}
                      className="w-20"
                    />
                    <span className="text-sm font-medium text-black">
                      {Math.round(mvpCost.cost_efficiency_score_0_1 * 100)}/100
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-gray-600">Confidence</p>
                  <span className="text-xs px-2 py-1 bg-[#F2F2F2] text-[#525252] rounded-full">
                    {Math.round(mvpCost.confidence_0_1 * 100)}% score
                  </span>
                </div>
              </div>
            )}
          </DashboardCard>

          {/* CARD D - Founder Fit */}
          <DashboardCard className="lg:col-span-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-black">Founder Fit</h2>
                  <Tooltip content="Founder Fit Score measures alignment between founder capabilities and startup requirements.">
                    <button
                      type="button"
                      className="text-gray-500 hover:text-black transition-colors"
                      aria-label="Founder fit info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
                <p className="text-sm text-gray-600">
                  {founderFit?.category ?? "—"}
                </p>
              </div>
              {founderFit != null && <ScoreRing score={founderFit.score} />}
            </div>
            {founderFit?.components && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Breakdown</p>
                <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Skill Score</span>
                  <span className="font-medium text-black">
                    {Math.round(founderFit.components.skill * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Industry Familiarity</span>
                  <span className="font-medium text-black">
                    {Math.round(founderFit.components.industry * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Age Factor</span>
                  <span className="font-medium text-black">
                    {Math.round(founderFit.components.age * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cost Alignment</span>
                  <span className="font-medium text-black">
                    {Math.round(founderFit.components.cost * 100)}%
                  </span>
                </div>
                </div>
              </div>
            )}
          </DashboardCard>

          {/* CARD E - Startup Advantage */}
          <DashboardCard className="lg:col-span-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-black">Startup Advantage</h2>
                  <Tooltip content="Startup Advantage Score evaluates competitive positioning based on multiple factors.">
                    <button
                      type="button"
                      className="text-gray-500 hover:text-black transition-colors"
                      aria-label="Startup advantage info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
                <p className="text-sm text-black">SAS Score</p>
              </div>
              {startupAdvantage != null && (
                <ScoreRing score={startupAdvantage.score} />
              )}
            </div>
            {startupAdvantage?.components && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Breakdown</p>
                <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Skill</span>
                  <span className="font-medium text-black">
                    {Math.round(startupAdvantage.components.skill * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Age</span>
                  <span className="font-medium text-black">
                    {Math.round(startupAdvantage.components.age * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cost Efficiency</span>
                  <span className="font-medium text-black">
                    {Math.round(startupAdvantage.components.costEff * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Product Type</span>
                  <span className="font-medium text-black">
                    {Math.round(startupAdvantage.components.productType * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Industry</span>
                  <span className="font-medium text-black">
                    {Math.round(startupAdvantage.components.industry * 100)}%
                  </span>
                </div>
                </div>
              </div>
            )}
          </DashboardCard>

          {/* CARD F - Founder Profile */}
          <DashboardCard className="lg:col-span-4">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">Founder Profile</h2>
              <Users className="w-5 h-5 text-orange-500" />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-[#F8F8F8] rounded-lg">
                <p className="text-2xl font-bold text-black">
                  {inputs.age != null ? String(inputs.age) : "—"}
                </p>
                <p className="text-xs text-gray-600">Age</p>
              </div>
              <div className="text-center p-3 bg-[#F8F8F8] rounded-lg">
                <p className="text-2xl font-bold text-black">
                  {inputs.teamSize != null ? String(inputs.teamSize) : "—"}
                </p>
                <p className="text-xs text-gray-600">Team</p>
              </div>
              <div className="text-center p-3 bg-[#F8F8F8] rounded-lg">
                <p className="text-lg font-bold text-black">
                  {inputs.hours != null ? `${inputs.hours}h` : "—"}
                </p>
                <p className="text-xs text-gray-600">/week</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {inputs.productType && (
                <span className="text-xs px-2 py-1 bg-orange-500/10 text-orange-500 rounded-full">
                  {inputs.productType}
                </span>
              )}
              {inputs.industry && (
                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                  {inputs.industry}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {inputs.idea && (
                <ExpandableText label="Idea" text={inputs.idea} />
              )}
              {inputs.targetCustomer && (
                <ExpandableText label="Target" text={inputs.targetCustomer} />
              )}
            </div>
          </DashboardCard>

          {/* CARD G - Skills & Industry */}
          <DashboardCard className="lg:col-span-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">Skills & Industry</h2>
              <Zap className="w-5 h-5 text-orange-500" />
            </div>

            {skills || industryResult ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  {skills && (
                    <div>
                      <p className="text-3xl font-bold text-black">
                        {skills.overall != null
                          ? `${Math.round(skills.overall * 100)}%`
                          : "—"}
                      </p>
                      <p className="text-sm text-gray-600">Overall Skill Score</p>
                    </div>
                  )}
                  {skills && industryResult && (
                    <div className="h-12 w-px bg-gray-200" />
                  )}
                  {industryResult && (
                    <div>
                      <p className="text-3xl font-bold text-black">
                        {industryResult.score != null
                          ? `${Math.round(industryResult.score * 100)}%`
                          : "—"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Industry Familiarity ({industryResult.level})
                      </p>
                    </div>
                  )}
                </div>

                {skills?.profile && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { key: "development", label: "Development" },
                      { key: "marketing", label: "Marketing" },
                      { key: "leadership", label: "Leadership" },
                    ].map(({ key, label }) => {
                      const level =
                        skills.profile[key as keyof typeof skills.profile] ?? "Unknown";
                      return (
                        <span
                          key={key}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-full font-medium",
                            level === "None" || level === "Unknown"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-orange-500/10 text-orange-500"
                          )}
                        >
                          {label}: {level}
                        </span>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  <span className="font-medium text-black">Evidence:</span>{" "}
                  {industryResult?.evidence?.length
                    ? industryResult.evidence[0]
                    : "Generic / non-specific experience"}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                Skills and industry data not available for this report.
              </p>
            )}
          </DashboardCard>

          {/* CARD H - Things You Need */}
          <DashboardCard className="lg:col-span-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">Things You Need</h2>
              <CheckSquare className="w-5 h-5 text-orange-500" />
            </div>
            <div className="space-y-2">
              {thingsNeed.length > 0 ? (
                thingsNeed.map((item, index) => (
                  <label
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F8F8F8] transition-colors cursor-pointer group"
                  >
                    <div className="w-5 h-5 border-2 border-gray-300 rounded group-hover:border-orange-500 transition-colors flex-shrink-0" />
                    <span className="text-sm text-black">{item.title}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-600">No items available.</p>
              )}
            </div>
          </DashboardCard>

          {/* CARD I - Competitors */}
          <DashboardCard className="lg:col-span-12">
            <h2 className="text-lg font-semibold text-black mb-4">Top Competitors</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {competitors.length > 0 ? (
                competitors.map((competitor) => (
                  <div
                    key={competitor.name}
                    className="p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <h3 className="font-semibold text-black mb-1">
                      {competitor.url && /^https?:\/\//i.test(competitor.url) ? (
                        <a
                          href={competitor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          {competitor.name}
                        </a>
                      ) : (
                        competitor.name
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {competitor.evidence ?? competitor.why_competitor ?? "—"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 col-span-full">
                  No competitors data available.
                </p>
              )}
            </div>
          </DashboardCard>

          {/* Supported MVP Scope */}
          <DashboardCard className="lg:col-span-12">
            <h2 className="text-lg font-semibold text-black mb-4">
              Supported MVP Scope
            </h2>
            <div className="flex flex-wrap gap-2">
              {mvpScopeList.length > 0 ? (
                mvpScopeList.map((item, index) => (
                  <span
                    key={index}
                    className="text-sm px-3 py-1.5 bg-gray-100 rounded-full text-black"
                  >
                    {item}
                  </span>
                ))
              ) : mvpCost?.recommended_mvp_scope ? (
                <span className="text-sm text-gray-600">
                  {mvpCost.recommended_mvp_scope}
                </span>
              ) : (
                <p className="text-sm text-gray-600">No scope available.</p>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>
    </main>
  );
}

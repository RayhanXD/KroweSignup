"use client";

import React, { useState } from "react";
import {
  Info,
  ChevronDown,
  ChevronUp,
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
  marketSize?: {
    market_definition?: string;
    tam_usd_range?: { low: number; high: number };
    sam_usd_range?: { low: number; high: number };
    wedge_sam_usd_range?: { low: number; high: number };
    planning_year_1?: { target_revenue_usd?: { low: number; high: number } };
  } | null;
  competitors?: Array<{ name: string; evidence?: string; why_competitor?: string }>;
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
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 text-center z-50 pointer-events-none">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
      </div>
    </div>
  );
}

function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {title}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
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
          className="text-muted"
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
          className="text-orange-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold">{Number.isFinite(safeScore) ? safeScore : "—"}</span>
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
        "bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md",
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
      <span className="text-muted-foreground">{label}: </span>
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

export function ReportDashboard({ report, status }: ReportDashboardProps) {
  const data = report?.data;

  if (status !== "ready" || !data) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-muted-foreground">
            {status === "processing"
              ? "Report is still generating."
              : "Report not available."}
          </p>
        </div>
      </main>
    );
  }

  const inputs = data.inputsSnapshot ?? {};
  const marketSize = data.marketSize ?? null;
  const timeToMvp = data.timeToMvp;
  const mvpCost = data.mvpCostEstimate;
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
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-black tracking-tight">
            Krowe Pre-Seed Advisor Report
          </h1>
          <p className="text-muted-foreground mt-1">Startup readiness analysis</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          {/* CARD A - Market Size (Hero) */}
          <DashboardCard className="lg:col-span-7 row-span-2" accent>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-black">Market Size</h2>
                  <Tooltip content={marketSize?.market_definition ?? "Market definition not available."}>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-black transition-colors"
                      aria-label="Market definition info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {inputs.industry ?? "—"}
                </p>
              </div>
              <Target className="w-5 h-5 text-orange-500" />
            </div>

            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-1">Planning Market Size</p>
              <p className="text-5xl md:text-6xl font-bold text-black tracking-tight">
                {marketSize
                  ? formatPlanningYear1(marketSize.planning_year_1)
                  : "—"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div>
                <p className="text-xs text-muted-foreground mb-1">TAM</p>
                <p className="text-lg font-semibold text-black">
                  {marketSize ? formatUsdRange(marketSize.tam_usd_range) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">SAM</p>
                <p className="text-lg font-semibold text-black">
                  {marketSize ? formatUsdRange(marketSize.sam_usd_range) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Initial Wedge</p>
                <p className="text-lg font-semibold text-black">
                  {marketSize ? formatUsdRange(marketSize.wedge_sam_usd_range) : "—"}
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
            <p className="text-sm text-muted-foreground mb-4">
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
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={Math.round(mvpCost.cost_efficiency_score_0_1 * 100)}
                    className="w-20"
                  />
                  <span className="text-sm font-medium text-black">
                    {Math.round(mvpCost.cost_efficiency_score_0_1 * 100)}/100
                  </span>
                </div>
                <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                  {Math.round(mvpCost.confidence_0_1 * 100)}% confidence
                </span>
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
                      className="text-muted-foreground hover:text-black transition-colors"
                      aria-label="Founder fit info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  {founderFit?.category ?? "—"}
                </p>
              </div>
              {founderFit != null && <ScoreRing score={founderFit.score} />}
            </div>
            {founderFit?.components && (
              <Collapsible title="View breakdown">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Skill Score</span>
                    <span className="font-medium text-black">
                      {Math.round(founderFit.components.skill * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Industry Familiarity</span>
                    <span className="font-medium text-black">
                      {Math.round(founderFit.components.industry * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Age Factor</span>
                    <span className="font-medium text-black">
                      {Math.round(founderFit.components.age * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost Alignment</span>
                    <span className="font-medium text-black">
                      {Math.round(founderFit.components.cost * 100)}%
                    </span>
                  </div>
                </div>
              </Collapsible>
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
                      className="text-muted-foreground hover:text-black transition-colors"
                      aria-label="Startup advantage info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">SAS Score</p>
              </div>
              {startupAdvantage != null && (
                <ScoreRing score={startupAdvantage.score} />
              )}
            </div>
            {startupAdvantage?.components && (
              <Collapsible title="View breakdown">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Skill</span>
                    <span className="font-medium text-black">
                      {Math.round(startupAdvantage.components.skill * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Age</span>
                    <span className="font-medium text-black">
                      {Math.round(startupAdvantage.components.age * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost Efficiency</span>
                    <span className="font-medium text-black">
                      {Math.round(startupAdvantage.components.costEff * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Product Type</span>
                    <span className="font-medium text-black">
                      {Math.round(startupAdvantage.components.productType * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Industry</span>
                    <span className="font-medium text-black">
                      {Math.round(startupAdvantage.components.industry * 100)}%
                    </span>
                  </div>
                </div>
              </Collapsible>
            )}
          </DashboardCard>

          {/* CARD F - Founder Profile */}
          <DashboardCard className="lg:col-span-4">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">Founder Profile</h2>
              <Users className="w-5 h-5 text-orange-500" />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-black">
                  {inputs.age != null ? String(inputs.age) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Age</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-black">
                  {inputs.teamSize != null ? String(inputs.teamSize) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Team</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold text-black">
                  {inputs.hours != null ? `${inputs.hours}h` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">/week</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {inputs.productType && (
                <span className="text-xs px-2 py-1 bg-orange-500/10 text-orange-500 rounded-full">
                  {inputs.productType}
                </span>
              )}
              {inputs.industry && (
                <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
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
                      <p className="text-sm text-muted-foreground">Overall Skill Score</p>
                    </div>
                  )}
                  {skills && industryResult && (
                    <div className="h-12 w-px bg-border" />
                  )}
                  {industryResult && (
                    <div>
                      <p className="text-3xl font-bold text-black">
                        {industryResult.score != null
                          ? `${Math.round(industryResult.score * 100)}%`
                          : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">
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
                              ? "bg-muted text-muted-foreground"
                              : "bg-orange-500/10 text-orange-500"
                          )}
                        >
                          {label}: {level}
                        </span>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-black">Evidence:</span>{" "}
                  {industryResult?.evidence?.length
                    ? industryResult.evidence[0]
                    : "Generic / non-specific experience"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
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
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-5 h-5 border-2 border-gray-300 rounded group-hover:border-orange-500 transition-colors flex-shrink-0" />
                    <span className="text-sm text-black">{item.title}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No items available.</p>
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
                      {competitor.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {competitor.evidence ?? competitor.why_competitor ?? "—"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground col-span-full">
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
                    className="text-sm px-3 py-1.5 bg-muted rounded-full text-black"
                  >
                    {item}
                  </span>
                ))
              ) : mvpCost?.recommended_mvp_scope ? (
                <span className="text-sm text-muted-foreground">
                  {mvpCost.recommended_mvp_scope}
                </span>
              ) : (
                <p className="text-sm text-muted-foreground">No scope available.</p>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>
    </main>
  );
}

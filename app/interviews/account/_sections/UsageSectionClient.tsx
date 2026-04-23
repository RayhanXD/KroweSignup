"use client";

import Link from "next/link";
import { BarChart3Icon, SparklesIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { getDashboardPageEntranceTiming } from "@/lib/motion/dashboardPageEntrance";
import { KROWE_EASE } from "@/lib/motion/kroweEase";

type Range = "24h" | "7d" | "30d";

type VelocityStyle = {
  label: string;
  className: string;
};

const STATUS_COLORS = {
  ready: { bg: "var(--success)", label: "Ready" },
  processing: { bg: "var(--warning)", label: "Processing" },
  collecting: { bg: "var(--primary)", label: "Collecting" },
  failed: { bg: "var(--danger)", label: "Failed" },
} as const;

type Status = keyof typeof STATUS_COLORS;

function CoverageArc({
  pct,
  inRange,
  total,
}: {
  pct: number;
  inRange: number;
  total: number;
}) {
  const r = 80;
  const cx = 104;
  const cy = 104;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={208}
        height={208}
        viewBox="0 0 208 208"
        aria-label={`${pct}% of interviews in window`}
        role="img"
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="11" />
        {clamped > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dashoffset 0.6s var(--ease-out-smooth)" }}
          />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tabular-nums text-foreground"
          style={{
            fontFamily: "var(--font-instrument-serif), ui-serif, Georgia, serif",
            fontSize: "2.75rem",
            lineHeight: 1,
            fontWeight: 400,
          }}
        >
          {inRange}
        </span>
        <span className="mt-1.5 text-[11px] text-muted-foreground">of {total}</span>
      </div>
    </div>
  );
}

function rangeChipClass(active: boolean): string {
  return active
    ? "rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary"
    : "rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground";
}

export type UsageProjectRow = {
  id: string;
  name: string;
  status: string;
  interview_count: number;
};

type Props = {
  range: Range;
  rangeDescription: string;
  totalProjects: number;
  activeProjects: number;
  readyProjects: number;
  totalInterviews: number;
  inRange: number;
  decisionsInRange: number;
  activityInRange: number;
  coveragePct: number;
  velocity: VelocityStyle;
  allProjects: UsageProjectRow[];
  sortedProjects: UsageProjectRow[];
  maxCount: number;
};

const HERO_HEADLINE = "Track how volume, decisions, and activity line up in one window.";
const HERO_SUBCOPY =
  "Rolling workspace analytics for interviews, decisions, and activity — switch the range chips in the header to compare cadence across 24 hours, seven days, or thirty days.";

export function UsageSectionClient({
  range,
  rangeDescription,
  totalProjects,
  activeProjects,
  readyProjects,
  totalInterviews,
  inRange,
  decisionsInRange,
  activityInRange,
  coveragePct,
  velocity,
  allProjects,
  sortedProjects,
  maxCount,
}: Props) {
  const reduceMotion = useReducedMotion();
  const words = HERO_HEADLINE.split(" ");
  const headlineWordCount = words.length;
  const { clipStart, perWordDelay, clipDuration, supportingDelay, buttonsDelay, overviewBlockDelay } =
    getDashboardPageEntranceTiming(headlineWordCount);

  const scrollToSignalMap = () => {
    document.getElementById("usage-signal-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const statMetrics = [
    { label: "Interviews in window", value: inRange, hint: `Coverage ${coveragePct}% of all-time total` },
    { label: "Ready decisions", value: decisionsInRange, hint: "Completed in this range" },
    { label: "Activity events", value: activityInRange, hint: "Across your workspaces" },
    { label: "Projects", value: totalProjects, hint: `${activeProjects} active · ${readyProjects} ready` },
  ];
  const queueTitleDelay = overviewBlockDelay + 0.16 + statMetrics.length * 0.022;

  const readinessPct = Math.max(8, Math.min(100, coveragePct));
  const queueCaption =
    totalInterviews === 0
      ? "Add interviews to projects to see coverage fill this arc."
      : `${coveragePct}% of ${totalInterviews} all-time interviews fall in ${rangeDescription}.`;

  const mainGridDelay = queueTitleDelay + 0.06;

  const signalRowsDelay = queueTitleDelay + 0.12;

  if (reduceMotion) {
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-gradient-to-br from-primary-soft via-background to-card shadow-[var(--shadow-1)]">
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse at 80% 40%, color-mix(in oklch, var(--primary) 18%, transparent) 0%, transparent 72%)",
            }}
          />
          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-semibold text-primary shadow-[var(--shadow-1)] backdrop-blur-sm">
              <SparklesIcon size={14} className="shrink-0" aria-hidden />
              Signal window
            </span>
            <h2 className="krowe-display-m mt-4 max-w-3xl text-pretty text-foreground">
              Track how volume, decisions, and activity line up in one{" "}
              <span className="text-primary">window.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{HERO_SUBCOPY}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToSignalMap}
                className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-4)] transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-smooth)] hover:-translate-y-px active:translate-y-px"
                style={{ background: "var(--gradient-primary)" }}
              >
                Jump to signal map
              </button>
              <Link
                href="/interviews/projects"
                className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-1)] transition-colors duration-[var(--duration-fast)] hover:border-primary hover:bg-surface-subtle"
              >
                All projects
              </Link>
            </div>
          </div>
        </div>

        <UsageOverviewStatic metrics={statMetrics} readinessPct={readinessPct} queueCaption={queueCaption} />

        <UsageMainGridStatic
          rangeDescription={rangeDescription}
          coveragePct={coveragePct}
          inRange={inRange}
          totalInterviews={totalInterviews}
          velocity={velocity}
          allProjects={allProjects}
          sortedProjects={sortedProjects}
          maxCount={maxCount}
          totalProjects={totalProjects}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-gradient-to-br from-primary-soft via-background to-card shadow-[var(--shadow-1)]">
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
            Signal window
          </motion.span>

          <h2 className="krowe-display-m mt-4 max-w-3xl text-pretty text-foreground">
            {words.map((word, i) => {
              const isAccent = i === words.length - 1;
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
            {HERO_SUBCOPY}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: buttonsDelay, duration: 0.24, ease: KROWE_EASE }}
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              onClick={scrollToSignalMap}
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-4)] transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-smooth)] hover:-translate-y-px active:translate-y-px"
              style={{ background: "var(--gradient-primary)" }}
            >
              Jump to signal map
            </button>
            <Link
              href="/interviews/projects"
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-1)] transition-colors duration-[var(--duration-fast)] hover:border-primary hover:bg-surface-subtle"
            >
              All projects
            </Link>
          </motion.div>

        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: overviewBlockDelay, duration: 0.28, ease: KROWE_EASE }}
        className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]"
      >
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h3 className="text-sm font-semibold text-foreground">Overview</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Range</span>
            {(["24h", "7d", "30d"] as Range[]).map((r) => (
              <Link key={r} href={`/interviews/account?tab=usage&range=${r}`} className={rangeChipClass(r === range)}>
                {r}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 lg:p-5">
          {statMetrics.map((metric, i) => (
            <motion.article
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: overviewBlockDelay + 0.04 + i * 0.034,
                duration: 0.22,
                ease: KROWE_EASE,
              }}
              className="rounded-[var(--radius-lg)] border border-border/80 bg-card px-5 py-4 shadow-[var(--shadow-1)] transition-shadow duration-[var(--duration-fast)] hover:shadow-[var(--shadow-2)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</p>
              <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-foreground">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
            </motion.article>
          ))}
        </div>

        <div className="border-t border-border/60 px-4 py-4 sm:px-5">
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${readinessPct}%` }}
              transition={{
                delay: overviewBlockDelay + 0.14 + statMetrics.length * 0.034,
                duration: 0.45,
                ease: KROWE_EASE,
              }}
              style={{ background: "var(--gradient-primary)" }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{queueCaption}</p>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: mainGridDelay, duration: 0.3, ease: KROWE_EASE }}
      >
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Coverage</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                Interviews added · {rangeDescription}
              </p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${velocity.className}`}>
              {velocity.label}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center px-6 py-10">
            <CoverageArc pct={coveragePct} inRange={inRange} total={totalInterviews} />
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {inRange === 0
                ? "No interviews added in this window"
                : `${coveragePct}% of all interviews captured in window`}
            </p>
          </div>
        </div>
      </motion.div>

      {sortedProjects.length > 0 && (
        <motion.section
          id="usage-signal-map"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: signalRowsDelay, duration: 0.28, ease: KROWE_EASE }}
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]"
        >
          <div className="border-b border-border/60 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Signal map</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">Interview volume by project</p>
          </div>

          <div className="space-y-3.5 px-5 py-5">
            {sortedProjects.map((p, index) => {
              const barPct = (p.interview_count / maxCount) * 100;
              const color = STATUS_COLORS[p.status as Status]?.bg ?? "var(--primary)";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: signalRowsDelay + 0.05 + index * 0.026,
                    duration: 0.22,
                    ease: KROWE_EASE,
                  }}
                >
                  <Link
                    href={`/interviews/${p.id}`}
                    className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  >
                    <p className="w-[140px] shrink-0 truncate text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      {p.name}
                    </p>
                    <div className="flex-1 overflow-hidden rounded-full bg-border/50" style={{ height: "6px" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barPct}%`,
                          background: color,
                          transition: "width 0.5s var(--ease-out-smooth)",
                        }}
                      />
                    </div>
                    <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {p.interview_count}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="border-t border-border/60 px-5 py-4">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Project status
            </p>
            <div className="flex h-2 w-full gap-px overflow-hidden rounded-full">
              {(Object.keys(STATUS_COLORS) as Status[]).map((status) => {
                const cnt = allProjects.filter((proj) => proj.status === status).length;
                if (!cnt) return null;
                const pct = (cnt / totalProjects) * 100;
                return (
                  <div
                    key={status}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${pct}%`, background: STATUS_COLORS[status].bg }}
                    title={`${STATUS_COLORS[status].label}: ${cnt}`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {(Object.keys(STATUS_COLORS) as Status[]).map((status) => {
                const cnt = allProjects.filter((proj) => proj.status === status).length;
                if (!cnt) return null;
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[status].bg }} />
                    <span className="text-xs text-muted-foreground">
                      {STATUS_COLORS[status].label}{" "}
                      <span className="font-semibold text-foreground">{cnt}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: signalRowsDelay + 0.15, duration: 0.24, ease: KROWE_EASE }}
        className="border-t border-border/50 pt-5"
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalInterviews}</span> total interviews across{" "}
          <span className="font-semibold text-foreground">{totalProjects}</span> projects — all time
        </p>
      </motion.div>
    </div>
  );
}

function UsageOverviewStatic({
  metrics,
  readinessPct,
  queueCaption,
}: {
  metrics: Array<{ label: string; value: number; hint: string }>;
  readinessPct: number;
  queueCaption: string;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">Overview</h3>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 lg:p-5">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[var(--radius-lg)] border border-border/80 bg-card px-5 py-4 shadow-[var(--shadow-1)] transition-shadow duration-[var(--duration-fast)] hover:shadow-[var(--shadow-2)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</p>
            <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-foreground">{metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
          </article>
        ))}
      </div>
      <div className="border-t border-border/60 px-4 py-4 sm:px-5">
        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-[width] duration-[var(--duration-fast)]"
            style={{ width: `${readinessPct}%`, background: "var(--gradient-primary)" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{queueCaption}</p>
      </div>
    </section>
  );
}

function UsageMainGridStatic({
  rangeDescription,
  coveragePct,
  inRange,
  totalInterviews,
  velocity,
  allProjects,
  sortedProjects,
  maxCount,
  totalProjects,
}: {
  rangeDescription: string;
  coveragePct: number;
  inRange: number;
  totalInterviews: number;
  velocity: VelocityStyle;
  allProjects: UsageProjectRow[];
  sortedProjects: UsageProjectRow[];
  maxCount: number;
  totalProjects: number;
}) {
  return (
    <>
      <div className="noise-surface relative overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-gradient-to-r from-primary-soft/90 via-background to-card px-5 py-4 shadow-[var(--shadow-1)] sm:px-7">
        <div className="relative z-[2] flex flex-wrap items-center gap-3">
          <BarChart3Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">
            <span className="text-primary">Signal window</span>
            <span className="text-muted-foreground">
              {" "}
              — Interview volume, ready decisions, and activity counts stay aligned with the same range chips as Home
              and Logs.
            </span>
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Coverage</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">Interviews added · {rangeDescription}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${velocity.className}`}>
            {velocity.label}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-10">
          <CoverageArc pct={coveragePct} inRange={inRange} total={totalInterviews} />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {inRange === 0
              ? "No interviews added in this window"
              : `${coveragePct}% of all interviews captured in window`}
          </p>
        </div>
      </div>

      {sortedProjects.length > 0 && (
        <section id="usage-signal-map" className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]">
          <div className="border-b border-border/60 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Signal map</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">Interview volume by project</p>
          </div>

          <div className="space-y-3.5 px-5 py-5">
            {sortedProjects.map((p) => {
              const barPct = (p.interview_count / maxCount) * 100;
              const color = STATUS_COLORS[p.status as Status]?.bg ?? "var(--primary)";
              return (
                <Link
                  key={p.id}
                  href={`/interviews/${p.id}`}
                  className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                >
                  <p className="w-[140px] shrink-0 truncate text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    {p.name}
                  </p>
                  <div className="flex-1 overflow-hidden rounded-full bg-border/50" style={{ height: "6px" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${barPct}%`,
                        background: color,
                        transition: "width 0.5s var(--ease-out-smooth)",
                      }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {p.interview_count}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border/60 px-5 py-4">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Project status
            </p>
            <div className="flex h-2 w-full gap-px overflow-hidden rounded-full">
              {(Object.keys(STATUS_COLORS) as Status[]).map((status) => {
                const count = allProjects.filter((p) => p.status === status).length;
                if (!count) return null;
                const pct = (count / totalProjects) * 100;
                return (
                  <div
                    key={status}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${pct}%`, background: STATUS_COLORS[status].bg }}
                    title={`${STATUS_COLORS[status].label}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {(Object.keys(STATUS_COLORS) as Status[]).map((status) => {
                const count = allProjects.filter((p) => p.status === status).length;
                if (!count) return null;
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[status].bg }} />
                    <span className="text-xs text-muted-foreground">
                      {STATUS_COLORS[status].label}{" "}
                      <span className="font-semibold text-foreground">{count}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="border-t border-border/50 pt-5">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalInterviews}</span> total interviews across{" "}
          <span className="font-semibold text-foreground">{totalProjects}</span> projects — all time
        </p>
      </div>
    </>
  );
}

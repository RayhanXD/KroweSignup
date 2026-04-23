"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { AnimatedField } from "@/app/components/motion/AnimatedField";
import { SelectFocusRing } from "@/app/components/motion/SelectFocusRing";
import { KROWE_EASE } from "@/lib/motion/kroweEase";
import { KroweButton } from "@/app/components/krowe/KroweButton";
import { KroweLinkButton } from "@/app/components/krowe/KroweLinkButton";

const LOGS_HERO_HEADLINE = "Every workspace action leaves a searchable trace.";
const LOGS_HERO_SUBCOPY =
  "Audit project-level actions and system events. Filter by action, entity, or time window — same mental model as Usage range chips.";

type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Props = {
  logs: ActivityLog[];
  errorMessage: string | null;
};

type DateFilter = "all" | "24h" | "7d" | "30d";

type ActionCategory = "project" | "analysis" | "system";

function getActionCategory(action: string): ActionCategory {
  if (action.startsWith("project_")) return "project";
  if (action.startsWith("analysis_")) return "analysis";
  return "system";
}

function prettyAction(action: string): string {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDateLabel(isoDate: string): string {
  const now = new Date();
  const target = new Date(isoDate);
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.floor(
    (nowMidnight.getTime() - targetMidnight.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return target.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function metadataEntries(metadata: Record<string, unknown> | null): Array<[string, string]> {
  if (!metadata) return [];
  return Object.entries(metadata).map(([key, value]) => {
    if (value == null) return [key, "—"];
    if (typeof value === "string") return [key, value];
    if (typeof value === "number" || typeof value === "boolean") return [key, String(value)];
    return [key, JSON.stringify(value)];
  });
}

function metadataPreview(metadata: Record<string, unknown> | null): string {
  const entries = metadataEntries(metadata);
  if (entries.length === 0) return "No metadata";
  return entries
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

function categoryPillClass(category: ActionCategory): string {
  if (category === "project") {
    return "border-success/25 bg-success-soft text-success";
  }
  if (category === "analysis") {
    return "border-primary/25 bg-primary-soft text-primary";
  }
  return "border-warning/25 bg-warning-soft text-warning";
}

export function LogsSectionClient({ logs, errorMessage }: Props) {
  const reduceMotion = useReducedMotion();
  const heroWords = LOGS_HERO_HEADLINE.split(" ");
  const hw = heroWords.length;
  const clipStart = 0.1;
  const perWordDelay = 0.038;
  const clipDuration = 0.24;
  const headlineEnd = clipStart + (hw - 1) * perWordDelay + clipDuration;
  const supportingDelay = headlineEnd + 0.04;
  const overviewBlockDelay = supportingDelay + 0.15;
  const metricCount = 4;
  const queueTitleDelay = overviewBlockDelay + 0.16 + metricCount * 0.022;
  const filterBaseDelay = overviewBlockDelay + 0.22;

  const [query, setQuery] = useState("");
  const [activeAction, setActiveAction] = useState<string>("all");
  const [activeEntity, setActiveEntity] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(logs[0]?.id ?? null);

  const anchorMs = logs[0] ? Date.parse(logs[0].created_at) : 0;

  const actionOptions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action))).sort();
  }, [logs]);

  const entityOptions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.entity_type))).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rangeMs =
      dateFilter === "24h"
        ? 24 * 60 * 60 * 1000
        : dateFilter === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : dateFilter === "30d"
            ? 30 * 24 * 60 * 60 * 1000
            : null;

    return logs.filter((log) => {
      if (activeAction !== "all" && log.action !== activeAction) return false;
      if (activeEntity !== "all" && log.entity_type !== activeEntity) return false;

      if (rangeMs !== null && anchorMs > 0) {
        const createdAt = new Date(log.created_at).getTime();
        if (!Number.isFinite(createdAt) || anchorMs - createdAt > rangeMs) return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        prettyAction(log.action),
        log.action,
        log.entity_type,
        log.entity_id ?? "",
        log.project_id ?? "",
        metadataPreview(log.metadata),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeAction, activeEntity, anchorMs, dateFilter, logs, query]);

  const selectedLog = useMemo(() => {
    const current = filteredLogs.find((log) => log.id === selectedId);
    return current ?? filteredLogs[0] ?? null;
  }, [filteredLogs, selectedId]);

  const groupedTimeline = useMemo(() => {
    return filteredLogs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
      const label = toDateLabel(log.created_at);
      if (!acc[label]) acc[label] = [];
      acc[label].push(log);
      return acc;
    }, {});
  }, [filteredLogs]);

  const latestEvent = filteredLogs[0];
  const distinctProjects = new Set(filteredLogs.map((log) => log.project_id).filter(Boolean)).size;
  const distinctActions = new Set(filteredLogs.map((log) => log.action)).size;

  const clearFilters = () => {
    setQuery("");
    setActiveAction("all");
    setActiveEntity("all");
    setDateFilter("all");
  };

  const filterSelectClass =
    "h-10 rounded-xl border border-border/80 bg-background px-3 text-sm font-medium normal-case text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";
  const filterSelectActionClass = `${filterSelectClass} min-w-40`;
  const filterSelectEntityClass = `${filterSelectClass} min-w-36`;

  const heroBlock = reduceMotion ? (
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
          Audit trail
        </span>
        <h2 className="krowe-display-m mt-4 max-w-3xl text-pretty text-foreground">
          Every workspace action leaves a searchable <span className="text-primary">trace.</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{LOGS_HERO_SUBCOPY}</p>
      </div>
    </div>
  ) : (
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
          Audit trail
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
          {LOGS_HERO_SUBCOPY}
        </motion.p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {heroBlock}

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : overviewBlockDelay, duration: 0.28, ease: KROWE_EASE }}
        className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]"
      >
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">Snapshot</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Related</span>
            <Link
              href="/interviews/account?tab=usage&range=24h"
              className="rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary"
            >
              Usage 24h
            </Link>
          </div>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 lg:p-5">
          {[
            {
              label: "Events shown",
              value: String(filteredLogs.length),
              hint: logs.length === filteredLogs.length ? "Full history loaded" : "Matches current filters",
            },
            { label: "Distinct actions", value: String(distinctActions), hint: "Unique event types in view" },
            { label: "Projects touched", value: String(distinctProjects), hint: "Distinct project ids" },
            {
              label: "Latest event",
              value: latestEvent
                ? new Date(latestEvent.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—",
              hint: "Most recent row in the filtered set",
              compact: true,
            },
          ].map((card, i) =>
            reduceMotion ? (
              <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} compact={"compact" in card ? card.compact : false} />
            ) : (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: overviewBlockDelay + 0.04 + i * 0.034,
                  duration: 0.22,
                  ease: KROWE_EASE,
                }}
              >
                <StatCard label={card.label} value={card.value} hint={card.hint} compact={"compact" in card ? card.compact : false} />
              </motion.div>
            ),
          )}
        </div>
      </motion.section>

      <motion.section
        id="logs-filters"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : filterBaseDelay, duration: 0.26, ease: KROWE_EASE }}
        className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]"
      >
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          <KroweButton type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Reset filters
          </KroweButton>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_auto_auto_auto] lg:items-end lg:gap-5 lg:p-5">
          <AnimatedField delay={reduceMotion ? 0 : filterBaseDelay + 0.02}>
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Search
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Action, entity, project id, metadata…"
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-sm font-normal tracking-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                aria-label="Search logs"
              />
            </label>
          </AnimatedField>

          <AnimatedField delay={reduceMotion ? 0 : filterBaseDelay + 0.055}>
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action
              <SelectFocusRing className="rounded-xl">
                <select
                  value={activeAction}
                  onChange={(event) => setActiveAction(event.target.value)}
                  aria-label="Filter by action"
                  className={filterSelectActionClass}
                >
                  <option value="all">All actions</option>
                  {actionOptions.map((action) => (
                    <option value={action} key={action}>
                      {prettyAction(action)}
                    </option>
                  ))}
                </select>
              </SelectFocusRing>
            </label>
          </AnimatedField>

          <AnimatedField delay={reduceMotion ? 0 : filterBaseDelay + 0.09}>
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Entity
              <SelectFocusRing className="rounded-xl">
                <select
                  value={activeEntity}
                  onChange={(event) => setActiveEntity(event.target.value)}
                  aria-label="Filter by entity"
                  className={filterSelectEntityClass}
                >
                  <option value="all">All entities</option>
                  {entityOptions.map((entity) => (
                    <option value={entity} key={entity}>
                      {entity}
                    </option>
                  ))}
                </select>
              </SelectFocusRing>
            </label>
          </AnimatedField>

          <AnimatedField delay={reduceMotion ? 0 : filterBaseDelay + 0.12}>
            <fieldset className="flex flex-col gap-1">
              <legend className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Time window
              </legend>
              <div
                role="radiogroup"
                aria-label="Date range filters"
                className="inline-flex h-10 rounded-full border border-border/80 bg-surface-subtle p-1"
              >
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "24h", label: "24h" },
                    { id: "7d", label: "7d" },
                    { id: "30d", label: "30d" },
                  ] as const
                ).map((range) =>
                  reduceMotion ? (
                    <button
                      key={range.id}
                      type="button"
                      role="radio"
                      aria-checked={dateFilter === range.id}
                      onClick={() => setDateFilter(range.id)}
                      className={cn(
                        "rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-subtle",
                        dateFilter === range.id
                          ? "border border-primary/30 bg-primary-soft text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {range.label}
                    </button>
                  ) : (
                    <motion.button
                      key={range.id}
                      type="button"
                      role="radio"
                      aria-checked={dateFilter === range.id}
                      onClick={() => setDateFilter(range.id)}
                      className={cn(
                        "rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-subtle",
                        dateFilter === range.id
                          ? "border border-primary/30 bg-primary-soft text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ duration: 0.18, ease: KROWE_EASE }}
                    >
                      {range.label}
                    </motion.button>
                  ),
                )}
              </div>
            </fieldset>
          </AnimatedField>
        </div>
      </motion.section>

      {errorMessage ? (
        <div className="rounded-[var(--radius-lg)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger shadow-[var(--shadow-1)]">
          <p className="font-semibold">Failed to load logs</p>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : logs.length === 0 ? (
        <section className="rounded-[var(--radius-lg)] border border-border/80 bg-card px-5 py-12 text-center shadow-[var(--shadow-1)]">
          <h3 className="text-base font-semibold text-foreground">No activity events yet</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Events appear when you update projects, request analysis, or archive workspaces.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <KroweLinkButton href="/interviews/projects" variant="secondary">
              Open projects
            </KroweLinkButton>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            <Link href="/interviews" className="font-semibold text-primary underline-offset-2 hover:underline">
              Back to Home
            </Link>
          </p>
        </section>
      ) : filteredLogs.length === 0 ? (
        <section className="rounded-[var(--radius-lg)] border border-border/80 bg-card px-5 py-12 text-center shadow-[var(--shadow-1)]">
          <h3 className="text-base font-semibold text-foreground">No matches for this filter set</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Adjust action, entity, time window, or search to see more rows.
          </p>
          <KroweButton type="button" variant="primary" size="sm" className="mt-4" onClick={clearFilters}>
            Show all events
          </KroweButton>
        </section>
      ) : (
        <div className="grid gap-6">
          <section className="hidden lg:block">
            {reduceMotion ? (
              <h3 className="mb-4 text-lg font-semibold tracking-tight text-foreground sm:text-xl">Event log</h3>
            ) : (
              <motion.h3
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: queueTitleDelay, duration: 0.2, ease: KROWE_EASE }}
                className="mb-4 text-lg font-semibold tracking-tight text-foreground sm:text-xl"
              >
                Event log
              </motion.h3>
            )}
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-3 border-b border-border bg-surface-subtle px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:px-5">
                <span>Action</span>
                <span>Entity</span>
                <span>Metadata</span>
                <span>When</span>
              </div>
              <div className="divide-y divide-border/60">
                {filteredLogs.map((log, index) => {
                  const isSelected = selectedLog?.id === log.id;
                  const category = getActionCategory(log.action);
                  const rowClass = cn(
                    "bg-card px-4 py-4 transition-colors duration-[var(--duration-fast)] hover:bg-surface-subtle lg:px-5",
                    isSelected && "bg-primary-soft/40",
                  );
                  const rowInner = (
                    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-3 md:items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{prettyAction(log.action)}</p>
                        <span
                          className={cn(
                            "mt-1 inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            categoryPillClass(category),
                          )}
                        >
                          {category}
                        </span>
                      </div>
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-foreground">{log.entity_type}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{log.entity_id ?? "—"}</p>
                      </div>
                      <div className="min-w-0 text-sm text-muted-foreground">
                        <p className="truncate" title={metadataPreview(log.metadata)}>
                          {metadataPreview(log.metadata)}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  );
                  if (reduceMotion) {
                    return (
                      <div key={log.id} className={rowClass}>
                        {rowInner}
                      </div>
                    );
                  }
                  return (
                    <motion.div
                      key={log.id}
                      className={rowClass}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: queueTitleDelay + 0.04 + index * 0.026,
                        duration: 0.22,
                        ease: KROWE_EASE,
                      }}
                    >
                      {rowInner}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-3 lg:hidden">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Event log</h3>
            {Object.entries(groupedTimeline).map(([dateLabel, dayLogs]) => (
              <div
                key={dateLabel}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-1)]"
              >
                <div className="border-b border-border/60 bg-surface-subtle px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {dateLabel}
                </div>
                <div className="divide-y divide-border/60">
                  {dayLogs.map((log) => {
                    const isExpanded = selectedLog?.id === log.id;
                    const category = getActionCategory(log.action);
                    const entries = metadataEntries(log.metadata);
                    return (
                      <article key={log.id} className="bg-card px-4 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{prettyAction(log.action)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              categoryPillClass(category),
                            )}
                          >
                            {category}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {log.entity_type} · {log.project_id ?? "No project id"}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedId((current) => (current === log.id ? null : log.id))}
                          className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                        {isExpanded && (
                          <dl className="mt-2 space-y-1 rounded-xl border border-border/80 bg-surface-subtle p-3">
                            {entries.length === 0 ? (
                              <div className="text-xs text-muted-foreground">No metadata for this event.</div>
                            ) : (
                              entries.map(([key, value]) => (
                                <div key={`${log.id}-${key}`} className="grid grid-cols-[minmax(0,120px)_1fr] gap-2 text-xs">
                                  <dt className="font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                    {key}
                                  </dt>
                                  <dd className="break-all text-foreground">{value}</dd>
                                </div>
                              ))
                            )}
                          </dl>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint, compact }: { label: string; value: string; hint: string; compact?: boolean }) {
  return (
    <article className="rounded-[var(--radius-lg)] border border-border/80 bg-card px-5 py-4 shadow-[var(--shadow-1)] transition-shadow duration-[var(--duration-fast)] hover:shadow-[var(--shadow-2)]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-sans font-semibold tabular-nums text-foreground", compact ? "text-xl" : "text-3xl")}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </article>
  );
}

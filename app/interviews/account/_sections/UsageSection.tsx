import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { UsageSectionClient, type UsageProjectRow } from "./UsageSectionClient";

export type Range = "24h" | "7d" | "30d";

export function parseRange(raw?: string): Range {
  if (raw === "7d" || raw === "30d") return raw;
  return "24h";
}

function rangeToSince(range: Range): string {
  const now = Date.now();
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

const RANGE_LABELS: Record<Range, string> = {
  "24h": "last 24 hours",
  "7d": "last 7 days",
  "30d": "last 30 days",
};

const VELOCITY = {
  high: { label: "High velocity", className: "border-success/30 bg-success-soft text-success" },
  moderate: { label: "Moderate", className: "border-warning/30 bg-warning-soft text-warning" },
  low: { label: "Low velocity", className: "border-border bg-surface-subtle text-muted-foreground" },
  none: { label: "No signal", className: "border-danger/30 bg-danger-soft text-danger" },
} as const;

function velocityKey(pct: number): keyof typeof VELOCITY {
  if (pct >= 40) return "high";
  if (pct >= 15) return "moderate";
  if (pct > 0) return "low";
  return "none";
}

export default async function UsageSection({ range }: { range: Range }) {
  const since = rangeToSince(range);

  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: projects } = await supabase
    .from("interview_projects")
    .select("id, name, status, interview_count")
    .eq("user_id", user.id)
    .is("archived_at", null);

  const projectIds = (projects ?? []).map((p) => p.id);

  const [interviewsRes, decisionsRes, logsRes] = await Promise.all([
    projectIds.length
      ? supabase
          .from("interviews")
          .select("id", { count: "exact", head: true })
          .in("project_id", projectIds)
          .gte("created_at", since)
      : Promise.resolve({ count: 0 }),
    projectIds.length
      ? supabase
          .from("decision_outputs")
          .select("id", { count: "exact", head: true })
          .in("project_id", projectIds)
          .eq("status", "ready")
          .gte("updated_at", since)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("dashboard_activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since),
  ]);

  const totalProjects = projects?.length ?? 0;
  const activeProjects =
    projects?.filter((p) => p.status === "collecting" || p.status === "processing").length ?? 0;
  const readyProjects = projects?.filter((p) => p.status === "ready").length ?? 0;
  const totalInterviews = projects?.reduce((s, p) => s + p.interview_count, 0) ?? 0;
  const inRange = interviewsRes.count ?? 0;
  const decisionsInRange = decisionsRes.count ?? 0;
  const activityInRange = logsRes.count ?? 0;
  const coveragePct = totalInterviews > 0 ? Math.round((inRange / totalInterviews) * 100) : 0;
  const velocity = VELOCITY[velocityKey(coveragePct)];

  const allProjects = (projects ?? []) as UsageProjectRow[];
  const sortedProjects = [...allProjects].sort((a, b) => b.interview_count - a.interview_count);
  const maxCount = Math.max(1, sortedProjects[0]?.interview_count ?? 1);

  return (
    <UsageSectionClient
      range={range}
      rangeDescription={RANGE_LABELS[range]}
      totalProjects={totalProjects}
      activeProjects={activeProjects}
      readyProjects={readyProjects}
      totalInterviews={totalInterviews}
      inRange={inRange}
      decisionsInRange={decisionsInRange}
      activityInRange={activityInRange}
      coveragePct={coveragePct}
      velocity={velocity}
      allProjects={allProjects}
      sortedProjects={sortedProjects}
      maxCount={maxCount}
    />
  );
}

import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "./LogoutButton";
import InterviewsShell from "./_components/InterviewsShell";

export const dynamic = "force-dynamic";

type Project = {
  id: string;
  name: string;
  status: "collecting" | "processing" | "ready" | "failed";
  interview_count: number;
  created_at: string;
};

type MetricItem = {
  label: string;
  value: string;
  hint: string;
  icon: string;
};

/** Stub until `description` (or similar) exists on `interview_projects`. */
function projectCardDescription(): string {
  return "Interview synthesis and decision context for this project. Add a short description when the schema supports it.";
}

/**
 * Top card pill derived from pipeline status only (no per-project “signal” column yet).
 */
function projectTierPill(project: Project): { label: string; className: string } {
  switch (project.status) {
    case "ready":
      return {
        label: "High Signal",
        className: "bg-interview-brand-tint text-interview-brand",
      };
    case "processing":
      return {
        label: "In Progress",
        className: "bg-muted text-[var(--muted-foreground)]",
      };
    case "failed":
      return {
        label: "Needs attention",
        className: "bg-danger-soft text-danger",
      };
    case "collecting":
    default:
      return {
        label: "Collecting",
        className: "bg-muted text-[var(--muted-foreground)]",
      };
  }
}

function projectFooterStatus(project: Project): {
  label: string;
  dotClass: string;
  textClass: string;
} {
  switch (project.status) {
    case "ready":
      return {
        label: "Ready",
        dotClass: "bg-interview-brand",
        textClass: "text-interview-brand",
      };
    case "processing":
      return {
        label: "In progress",
        dotClass: "bg-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)] animate-pulse",
        textClass: "text-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)]",
      };
    case "failed":
      return {
        label: "Failed",
        dotClass: "bg-danger",
        textClass: "text-danger",
      };
    case "collecting":
    default:
      return {
        label: "Draft",
        dotClass: "bg-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)]",
        textClass: "text-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)]",
      };
  }
}

function getLastUpdatedLabel(projects: Project[]): string {
  if (!projects.length) return "No updates yet";

  const latest = projects[0];
  const now = Date.now();
  const updatedMs = new Date(latest.created_at).getTime();
  const diffHours = Math.max(1, Math.floor((now - updatedMs) / (1000 * 60 * 60)));

  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getStatusTone(project: Project): string {
  if (project.status === "ready") return "bg-interview-brand-tint text-interview-brand";
  if (project.status === "failed") return "bg-danger-soft text-danger";
  return "bg-muted text-muted-foreground";
}

export default async function InterviewsPage() {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("interview_projects")
    .select("id, name, status, interview_count, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as Project[];
  const hasProject = projects.length > 0;

  if (!hasProject) redirect("/interviews/new");

  const totalInterviews = projects.reduce(
    (sum, project) => sum + project.interview_count,
    0,
  );
  const activeProjects = projects.filter(
    (project) => project.status === "collecting" || project.status === "processing",
  ).length;
  const readyProjects = projects.filter((project) => project.status === "ready").length;

  const metrics: MetricItem[] = [
    {
      label: "Projects",
      value: projects.length.toString(),
      hint: `${activeProjects} active`,
      icon: "workspaces",
    },
    {
      label: "Interviews",
      value: totalInterviews.toString(),
      hint: "Across all projects",
      icon: "forum",
    },
    {
      label: "Ready Decisions",
      value: readyProjects.toString(),
      hint: "Ready to review",
      icon: "task_alt",
    },
    {
      label: "Last Updated",
      value: getLastUpdatedLabel(projects),
      hint: "Latest project activity",
      icon: "schedule",
    },
  ];

  return (
    <InterviewsShell activeNav="intel" topbarTitle="Krowe Dashboard" topbarActions={<LogoutButton />}>
      <article className="mb-3 overflow-hidden rounded-xl border border-border/60 bg-[radial-gradient(circle_at_90%_20%,color-mix(in_srgb,var(--interview-brand)_25%,white)_0%,transparent_38%),linear-gradient(180deg,color-mix(in_srgb,var(--interview-brand-tint)_42%,white),white)] p-4">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  <Image
                    src="/KroweIcon.png"
                    alt="Krowe badge"
                    width={14}
                    height={14}
                    className="h-[14px] w-[14px] rounded-[3px]"
                  />
                  Krowe Intelligence
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Project intelligence at a glance
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Track interview volume, project readiness, and decision velocity in one operational console.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/interviews/new"
                    className="rounded-full bg-gradient-to-br from-interview-brand to-interview-brand-end px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-95"
                  >
                    Get started
                  </Link>
                  <Link
                    href="https://docs.krowe.com"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border/70 px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                  >
                    Read docs
                  </Link>
                </div>
              </article>

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                  <h3 className="text-sm font-medium text-foreground">Home</h3>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/interviews/account?tab=usage&range=24h"
                      className="rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground"
                    >
                      24h
                    </Link>
                    <Link
                      href="/interviews/account?tab=usage&range=7d"
                      className="rounded-md border border-border/70 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      7d
                    </Link>
                    <Link
                      href="/interviews/account?tab=usage&range=30d"
                      className="rounded-md border border-border/70 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      30d
                    </Link>
                  </div>
                </div>

                <div className="grid gap-px bg-border/60 md:grid-cols-4">
                  {metrics.map((metric) => (
                    <article key={metric.label} className="bg-card px-3 py-3">
                      <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{metric.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
                    </article>
                  ))}
                </div>

                <div className="border-t border-border/60 p-3">
                  <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-interview-brand to-interview-brand-end"
                      style={{
                        width: `${Math.max(10, Math.round((readyProjects / projects.length) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Decision readiness: {readyProjects}/{projects.length} projects in ready state.
                  </p>
                </div>
      </section>

      <section className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-foreground">Project queue</h3>
                <div className="overflow-hidden rounded-xl border border-border/60">
                  <div className="hidden grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-2 border-b border-border/60 bg-muted/35 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground md:grid">
                    <span>Project</span>
                    <span>Signal</span>
                    <span>Status</span>
                    <span>Interviews</span>
                    <span>Created</span>
                  </div>
                  <div className="divide-y divide-border/60">
                    {projects.map((project) => {
                      const tier = projectTierPill(project);
                      const footer = projectFooterStatus(project);
                      return (
                        <Link
                          key={project.id}
                          href={`/interviews/${project.id}`}
                          className="group block bg-card px-3 py-3 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interview-brand/35"
                        >
                          <div className="grid gap-2 md:grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_0.8fr] md:items-center">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{project.name}</p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {projectCardDescription()}
                              </p>
                            </div>
                            <span
                              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tier.className}`}
                            >
                              {tier.label}
                            </span>
                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusTone(project)}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${footer.dotClass}`} />
                              {footer.label}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {project.interview_count}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {new Date(project.created_at).toLocaleDateString()}
                              <span
                                className="material-symbols-outlined text-sm text-[color-mix(in_srgb,var(--muted-foreground)_78%,transparent)] transition-colors group-hover:text-interview-brand"
                                aria-hidden
                              >
                                north_east
                              </span>
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
      </section>
    </InterviewsShell>
  );
}

import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

type Project = {
  id: string;
  name: string;
  status: "collecting" | "processing" | "ready" | "failed";
  interview_count: number;
  created_at: string;
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

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1100px] mx-auto px-5 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
          <div>
            <h1 className="serif-text text-3xl font-bold text-foreground tracking-tight">
              Active Projects
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm font-medium">
              Strategic intelligence and decision specs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <Link
              href="/interviews/new"
              className="bg-gradient-to-br from-interview-brand to-interview-brand-end text-primary-foreground px-4 py-2 rounded-full font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:translate-y-[-1px] transition-all"
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                add
              </span>
              New Project
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((project) => {
            const tier = projectTierPill(project);
            const footer = projectFooterStatus(project);
            return (
              <Link
                key={project.id}
                href={`/interviews/${project.id}`}
                className="bg-card border border-border/40 rounded-xl p-4 hover:shadow-lg transition-all duration-300 group cursor-pointer block"
              >
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${tier.className}`}
                  >
                    {tier.label}
                  </span>
                  <span
                    className="material-symbols-outlined text-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)] group-hover:text-interview-brand transition-colors"
                    aria-hidden
                  >
                    more_horiz
                  </span>
                </div>
                <h3 className="text-[16px] serif-text font-semibold text-foreground mb-1.5 leading-tight">
                  {project.name}
                </h3>
                <p className="text-[color-mix(in srgb, var(--muted-foreground) 90%, transparent)] text-xs leading-relaxed mb-4 line-clamp-2">
                  {projectCardDescription()}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-[13px] text-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)]">
                    <span className="material-symbols-outlined text-sm" aria-hidden>
                      forum
                    </span>
                    {project.interview_count} interview{project.interview_count !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] text-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)]">
                    <span className="material-symbols-outlined text-sm" aria-hidden>
                      calendar_today
                    </span>
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-[13px] font-medium ${footer.textClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${footer.dotClass}`} />
                    {footer.label}
                  </div>
                </div>
              </Link>
            );
          })}

          <Link
            href="/interviews/new"
            className="border-2 border-dashed border-border/40 rounded-xl p-4 flex flex-col items-center justify-center text-center group hover:border-interview-brand/20 hover:bg-interview-brand-tint/10 transition-all cursor-pointer min-h-[170px]"
          >
            <div className="w-10 h-10 rounded-full bg-card border border-border/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-interview-brand" aria-hidden>
                add
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">Create New Insight Loop</h3>
            <p className="text-xs text-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)] mt-1">Start from interviews or upload docs.</p>
          </Link>
        </div>

        {/*
          Multi-project: `interview_projects.user_id` is UNIQUE (see migration 016) and
          `/interviews/new` redirects if a project already exists—only one project per user
          until schema + new-project flow are updated.
        */}
        <footer className="mt-16 pt-6 border-t border-border/40 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center text-[11px] text-[color-mix(in srgb, var(--muted-foreground) 78%, transparent)] font-medium tracking-wide uppercase">
          <div className="flex flex-wrap items-center gap-6">
            <span>System Status: Optimal</span>
            <span>Version: 1.0.4-Founder</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a className="hover:text-foreground transition-colors" href="#">
              Documentation
            </a>
            <a className="hover:text-foreground transition-colors" href="#">
              Security Audit
            </a>
            <a className="hover:text-foreground transition-colors" href="#">
              Feedback
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

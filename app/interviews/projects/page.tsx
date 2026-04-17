import Link from "next/link";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { ProjectsManagerClient, type DashboardProject } from "./ProjectsManagerClient";
import LogoutButton from "../LogoutButton";
import InterviewsShell from "../_components/InterviewsShell";
import DashboardPageHeader from "../_components/DashboardPageHeader";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  const { data, error } = await supabase
    .from("interview_projects")
    .select("id, name, status, interview_count, created_at, updated_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <InterviewsShell topbarTitle="Krowe Dashboard" topbarActions={<LogoutButton />}>
        <div>
          <div className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
            Failed to load projects: {error.message}
          </div>
        </div>
      </InterviewsShell>
    );
  }

  const projects = (data ?? []) as DashboardProject[];

  return (
    <InterviewsShell topbarTitle="Krowe Dashboard" topbarActions={<LogoutButton />}>
      <div className="space-y-5">
        <DashboardPageHeader
          title="Projects"
          description="Manage your interview workspaces, rename active projects, and archive completed ones."
          actions={
            <>
              <Link
                href="/interviews"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
              >
                Back to Home
              </Link>
              {(isAdmin || projects.length === 0) && (
                <Link
                  href="/interviews/new"
                  className="rounded-full bg-gradient-to-br from-interview-brand to-interview-brand-end px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  New Project
                </Link>
              )}
            </>
          }
        />
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
            <p className="text-xs text-muted-foreground">Active projects</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{projects.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Not archived</p>
          </article>
          <article className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
            <p className="text-xs text-muted-foreground">Total interviews</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {projects.reduce((sum, project) => sum + project.interview_count, 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Across active projects</p>
          </article>
          <article className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
            <p className="text-xs text-muted-foreground">Ready projects</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {projects.filter((project) => project.status === "ready").length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Decision outputs available</p>
          </article>
          <article className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
            <p className="text-xs text-muted-foreground">In progress</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {
                projects.filter(
                  (project) => project.status === "collecting" || project.status === "processing",
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Collecting or processing</p>
          </article>
        </section>
        <ProjectsManagerClient initialProjects={projects} isAdmin={isAdmin} />
      </div>
    </InterviewsShell>
  );
}

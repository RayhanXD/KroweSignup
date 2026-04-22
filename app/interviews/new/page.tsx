import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import Link from "next/link";
import LogoutButton from "../LogoutButton";
import InterviewsShell from "../_components/InterviewsShell";
import DashboardPageHeader from "../_components/DashboardPageHeader";
import NewProjectForm from "./NewProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    const { data: existing } = await supabase
      .from("interview_projects")
      .select("id")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (existing) redirect(`/interviews/${existing.id}`);
  }

  return (
    <InterviewsShell activeNav="projects" topbarTitle="Krowe Dashboard" topbarActions={<LogoutButton />} allowWithoutProject>
      <div className="space-y-5">
        <DashboardPageHeader
          title="Create Project"
          description="Shape a clear research brief and launch a project workspace designed for fast interview-driven decisions."
          actions={
            <Link
              href="/interviews/projects"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
            >
              Back to projects
            </Link>
          }
        />
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="grid gap-px bg-border/60 lg:grid-cols-[0.95fr_1.35fr]">
            <aside className="bg-[linear-gradient(160deg,color-mix(in_srgb,var(--interview-brand-tint)_45%,white)_0%,white_68%)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Project Brief
              </p>
              <h3 className="mt-2 serif-text text-2xl font-semibold leading-tight text-foreground">
                Start with intent,
                <br />
                not just a title
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Define a focused project so your interview signals, analysis, and decisions stay traceable
                from day one.
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Step 1
                  </p>
                  <p className="mt-1 text-sm text-foreground">Name your opportunity space</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Step 2
                  </p>
                  <p className="mt-1 text-sm text-foreground">Link context (optional for admins)</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Step 3
                  </p>
                  <p className="mt-1 text-sm text-foreground">Launch and begin interview collection</p>
                </div>
              </div>
            </aside>
            <div className="bg-card p-5 sm:p-6">
              <NewProjectForm isAdmin={isAdmin} />
            </div>
          </div>
        </section>
      </div>
    </InterviewsShell>
  );
}

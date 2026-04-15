import Link from "next/link";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import LogoutButton from "../LogoutButton";
import InterviewsShell from "../_components/InterviewsShell";
import DashboardPageHeader from "../_components/DashboardPageHeader";

type Range = "24h" | "7d" | "30d";

function parseRange(raw?: string): Range {
  if (raw === "7d" || raw === "30d") return raw;
  return "24h";
}

function rangeToSince(range: Range): string {
  const now = Date.now();
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

export const dynamic = "force-dynamic";

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const resolved = await searchParams;
  const range = parseRange(resolved.range);
  const since = rangeToSince(range);

  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: projects } = await supabase
    .from("interview_projects")
    .select("id, status, interview_count")
    .eq("user_id", user.id)
    .is("archived_at", null);

  const projectIds = (projects ?? []).map((project) => project.id);

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
    projects?.filter((project) => project.status === "collecting" || project.status === "processing")
      .length ?? 0;
  const totalInterviews = projects?.reduce((sum, project) => sum + project.interview_count, 0) ?? 0;

  return (
    <InterviewsShell activeNav="usage" topbarTitle="Krowe Dashboard" topbarActions={<LogoutButton />}>
      <div className="space-y-5">
        <DashboardPageHeader
          title="Usage"
          description="Monitor project and interview activity trends across key time windows."
          actions={
            <Link
              href="/interviews"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
            >
              Back to Home
            </Link>
          }
        />

        <div className="flex items-center gap-2">
          {(["24h", "7d", "30d"] as Range[]).map((item) => (
            <Link
              key={item}
              href={`/interviews/usage?range=${item}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                item === range
                  ? "border-interview-brand/50 bg-interview-brand-tint text-interview-brand"
                  : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {item}
            </Link>
          ))}
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-border/60 bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground">Total projects</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{totalProjects}</p>
            <p className="mt-1 text-xs text-muted-foreground">{activeProjects} active</p>
          </article>
          <article className="rounded-xl border border-border/60 bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground">Total interviews</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{totalInterviews}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across active projects</p>
          </article>
          <article className="rounded-xl border border-border/60 bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground">Interviews in range</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{interviewsRes.count ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Since {new Date(since).toLocaleDateString()}</p>
          </article>
          <article className="rounded-xl border border-border/60 bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground">Ready decisions in range</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{decisionsRes.count ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">{logsRes.count ?? 0} activity events</p>
          </article>
        </section>
      </div>
    </InterviewsShell>
  );
}

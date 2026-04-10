import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";

type Project = {
  id: string;
  name: string;
  status: "collecting" | "processing" | "ready" | "failed";
  interview_count: number;
  created_at: string;
};

const STATUS_CONFIG: Record<
  Project["status"],
  { label: string; dot: string; text: string; bg: string }
> = {
  collecting: {
    label: "Collecting",
    dot: "bg-blue-500",
    text: "text-blue-700",
    bg: "bg-blue-50",
  },
  processing: {
    label: "Processing",
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  ready: {
    label: "Ready",
    dot: "bg-green-500",
    text: "text-green-700",
    bg: "bg-green-50",
  },
  failed: {
    label: "Failed",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
  },
};

function StatusPill({ status }: { status: Project["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.text} ${cfg.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
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

  if (projects.length === 0) redirect("/interviews/new");

  return (
    <div className="min-h-dvh bg-zinc-50">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* Page header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Projects</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {FEATURE_FLAGS.granolaImports && (
              <Link
                href="/interviews/imports"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                Granola imports
              </Link>
            )}
            <Link
              href="/interviews/new"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              New project
            </Link>
          </div>
        </div>

        {/* Projects list */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {projects.map((project, i) => (
            <Link
              key={project.id}
              href={`/interviews/${project.id}`}
              className={`flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors ${
                i < projects.length - 1 ? "border-b border-zinc-100" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-900 truncate">{project.name}</span>
                  <StatusPill status={project.status} />
                </div>
                <p className="mt-0.5 text-sm text-zinc-400">
                  {project.interview_count} interview{project.interview_count !== 1 ? "s" : ""}
                  {" · "}
                  {new Date(project.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {project.status === "ready" ? (
                <span className="ml-4 shrink-0 text-sm font-medium text-orange-500">
                  View decision →
                </span>
              ) : (
                <span className="ml-4 shrink-0 text-zinc-300">→</span>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

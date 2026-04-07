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

function StatusBadge({ status }: { status: Project["status"] }) {
  const styles: Record<Project["status"], string> = {
    collecting: "bg-blue-100 text-blue-700",
    processing: "bg-yellow-100 text-yellow-700",
    ready: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status === "processing" && (
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      )}
      {status}
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
  const hasProject = projects.length > 0;

  if (!hasProject) redirect("/interviews/new");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Decision Engine</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Turn user interviews into product decisions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!hasProject && (
              <Link
                href="/interviews/new"
                className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                New Project
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No projects yet</p>
            <p className="text-sm">Create a project to start analyzing user interviews.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/interviews/${project.id}`}
                className="block border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{project.name}</span>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {project.interview_count} interview{project.interview_count !== 1 ? "s" : ""}
                      {" · "}
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {project.status === "ready" && (
                    <span className="shrink-0 text-xs font-medium text-green-600">View decision →</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

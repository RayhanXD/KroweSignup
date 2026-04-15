import Link from "next/link";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function prettyAction(action: string): string {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("dashboard_activity_logs")
    .select("id, action, entity_type, entity_id, project_id, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = (data ?? []) as ActivityLog[];

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-[1040px] space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Dashboard
            </p>
            <h1 className="serif-text mt-1 text-3xl font-semibold text-foreground">Activity Logs</h1>
          </div>
          <Link
            href="/interviews"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
          >
            Back to Home
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
            Failed to load logs: {error.message}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No activity events yet.
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="grid grid-cols-[1.1fr_0.8fr_0.9fr_0.9fr] gap-2 border-b border-border/60 bg-muted/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Action</span>
              <span>Entity</span>
              <span>Project</span>
              <span>When</span>
            </div>
            <div className="divide-y divide-border/60">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[1.1fr_0.8fr_0.9fr_0.9fr] gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{prettyAction(log.action)}</p>
                    {log.metadata && Object.keys(log.metadata).length > 0 ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground">{log.entity_type}</span>
                  <span className="truncate text-muted-foreground">{log.project_id ?? "N/A"}</span>
                  <span className="text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

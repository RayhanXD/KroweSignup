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

export default async function LogsSection() {
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
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Activity Logs</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Audit project-level actions and system events from your interview workspace.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          Failed to load logs: {error.message}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-background px-4 py-8 text-center text-sm text-muted-foreground">
          No activity events yet.
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
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
  );
}

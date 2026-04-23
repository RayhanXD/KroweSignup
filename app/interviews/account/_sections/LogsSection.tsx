import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { LogsSectionClient } from "./LogsSectionClient";

type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

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

  return <LogsSectionClient logs={logs} errorMessage={error?.message ?? null} />;
}

import type { SupabaseClient } from "@supabase/supabase-js";

type DashboardActivityParams = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort dashboard activity logger.
 * Never throws because activity logging should not block product workflows.
 */
export async function trackDashboardActivity(
  supabase: SupabaseClient,
  params: DashboardActivityParams,
): Promise<void> {
  const { userId, action, entityType, entityId = null, projectId = null, metadata = {} } = params;

  try {
    const { error } = await supabase.from("dashboard_activity_logs").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      project_id: projectId,
      metadata,
    });

    if (error) {
      console.warn("[dashboardActivity] insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[dashboardActivity] unexpected failure:", err);
  }
}

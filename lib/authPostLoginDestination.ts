import type { SupabaseClient } from "@supabase/supabase-js";

type SignupSessionStatus = {
  status: string | null;
};

function isSafeRelativePath(path: string | null | undefined) {
  return Boolean(path && path.startsWith("/"));
}

export function getSafeRedirectPath(path: string | null | undefined) {
  return isSafeRelativePath(path) ? path! : null;
}

export async function getPostLoginDestination(
  supabase: SupabaseClient,
  userId: string,
  requestedPath?: string | null
) {
  const safeRequestedPath = getSafeRedirectPath(requestedPath);

  const { data, error } = await supabase
    .from("signup_sessions")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle<SignupSessionStatus>();

  if (error) {
    console.error("[authPostLoginDestination] failed to query signup_sessions:", error.message);
  }

  const hasCompletedOnboarding = Boolean(data);
  if (!hasCompletedOnboarding) return "/signup";
  return safeRequestedPath ?? "/interviews";
}

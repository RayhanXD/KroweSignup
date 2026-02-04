import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { RefreshReportButton } from "./RefreshReportButton";
import { ReportDashboard } from "./ReportDashboard";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  if (!sessionId) {
    return (
      <div className="p-6">
        <div className="font-semibold text-red-600">Missing sessionId in route.</div>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("signup_reports")
    .select("id, status, report, created_at, updated_at")
    .eq("session_id", sessionId)
    .single();

  if (error) {
    return (
      <div className="p-6">
        <div className="font-semibold">Report not found</div>
        <pre className="mt-3 text-sm text-red-600">{error.message}</pre>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">Session: {sessionId}</span>
        <RefreshReportButton sessionId={sessionId} />
      </div>
      <ReportDashboard report={data.report ?? {}} status={data.status} />
    </div>
  );
}

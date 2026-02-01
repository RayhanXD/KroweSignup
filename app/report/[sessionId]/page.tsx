import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { RefreshReportButton } from "./RefreshReportButton";

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
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-2xl font-semibold text-black">Krowe Report (Skeleton)</div>
          <RefreshReportButton sessionId={sessionId} />
        </div>
        <div className="mt-2 text-sm text-gray-600">Session: {sessionId}</div>

      <pre className="mt-6 whitespace-pre-wrap text-sm bg-gray-50 border rounded-xl p-4 overflow-auto text-black">
        {data.report.markdown}
        </pre>

      </div>
    </div>
  );
}

import Link from "next/link";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import LogoutButton from "../LogoutButton";
import InterviewsShell from "../_components/InterviewsShell";
import DashboardPageHeader from "../_components/DashboardPageHeader";
import FeedbackForm from "./FeedbackForm";

export const dynamic = "force-dynamic";

type ProjectOption = {
  id: string;
  name: string;
};

export default async function FeedbackPage() {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("interview_projects")
    .select("id, name")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <InterviewsShell activeNav="feedback" topbarTitle="Krowe Dashboard" topbarActions={<LogoutButton />}>
        <div className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          Could not load project context for feedback. Please refresh and try again.
        </div>
      </InterviewsShell>
    );
  }

  const projects = (data ?? []) as ProjectOption[];

  return (
    <InterviewsShell activeNav="feedback" topbarTitle="Krowe Dashboard" topbarActions={<LogoutButton />}>
      <div className="space-y-5">
        <DashboardPageHeader
          eyebrow="Feedback"
          title="Help us sharpen Krowe"
          description="Tell us what's working and what's getting in the way."
          actions={
            <Link
              href="/interviews"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
            >
              Back to Home
            </Link>
          }
        />

        <FeedbackForm projects={projects} />
      </div>
    </InterviewsShell>
  );
}

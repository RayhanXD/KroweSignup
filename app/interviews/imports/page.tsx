import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import LogoutButton from "../LogoutButton";
import InterviewsShell from "../_components/InterviewsShell";
import { ImportsClient } from "./ImportsClient";

export const dynamic = "force-dynamic";

type InboxItem = {
  id: string;
  external_note_id: string;
  title: string | null;
  transcript_preview: string;
  summary_text: string | null;
  summary_markdown: string | null;
  owner_name: string | null;
  owner_email: string | null;
  granola_created_at: string | null;
  granola_updated_at: string;
  attendees: Array<{ name: string | null; email: string }>;
  normalized_text: string;
};

type Project = {
  id: string;
  name: string;
  status: string;
};

type Connection = {
  id: string;
  status: "active" | "invalid" | "disabled";
  key_hint: string | null;
  last_sync_completed_at: string | null;
  last_error: string | null;
};

export default async function InterviewImportsPage() {
  if (!FEATURE_FLAGS.granolaImports) {
    redirect("/interviews");
  }

  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const [{ data: items }, { data: projects }, { data: connection }] = await Promise.all([
    supabase
      .from("granola_inbox_items")
      .select(
        "id, external_note_id, title, transcript_preview, summary_text, summary_markdown, owner_name, owner_email, granola_created_at, granola_updated_at, attendees, normalized_text"
      )
      .eq("user_id", user.id)
      .eq("assignment_status", "unassigned")
      .order("granola_updated_at", { ascending: false }),
    supabase
      .from("interview_projects")
      .select("id, name, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("granola_connections")
      .select("id, status, key_hint, last_sync_completed_at, last_error")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <InterviewsShell activeNav="imports" topbarTitle="Krowe Dashboard" topbarActions={<LogoutButton />}>
      <ImportsClient
        initialItems={(items ?? []) as InboxItem[]}
        projects={(projects ?? []) as Project[]}
        initialConnection={(connection ?? null) as Connection | null}
      />
    </InterviewsShell>
  );
}

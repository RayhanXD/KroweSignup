import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

export default async function InterviewScriptRedirectPage() {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("interview_projects")
    .select("id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) redirect("/interviews/new");

  redirect(`/interviews/${data.id}/script`);
}

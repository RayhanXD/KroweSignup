import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import NewProjectForm from "./NewProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  // If user already has a project, redirect to it
  const { data: existing } = await supabase
    .from("interview_projects")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (existing) {
    redirect(`/interviews/${existing.id}`);
  }

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  return <NewProjectForm isAdmin={isAdmin} />;
}

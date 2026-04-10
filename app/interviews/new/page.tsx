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

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  return <NewProjectForm isAdmin={isAdmin} />;
}

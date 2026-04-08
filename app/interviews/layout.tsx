import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { getPostLoginDestination } from "@/lib/authPostLoginDestination";

export default async function InterviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const destination = await getPostLoginDestination(supabase, user.id);
  if (destination === "/signup") {
    redirect("/signup");
  }

  return <>{children}</>;
}

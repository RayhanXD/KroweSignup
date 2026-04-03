import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export default async function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin?redirectTo=/signup");
  return <>{children}</>;
}

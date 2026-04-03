import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import SignInButton from "./SignInButton";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error, redirectTo } = await searchParams;
  if (user) redirect(redirectTo?.startsWith("/") ? redirectTo : "/interviews");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-sm w-full px-4">
        <h1 className="text-2xl font-bold mb-2 text-center">Decision Engine</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Sign in to access your interview projects
        </p>
        {error && (
          <p className="text-sm text-red-600 text-center mb-4">
            Sign-in failed. Please try again.
          </p>
        )}
        <SignInButton redirectTo={redirectTo} />
      </div>
    </div>
  );
}

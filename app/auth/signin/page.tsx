import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { getPostLoginDestination } from "@/lib/authPostLoginDestination";
import SignInButton from "./SignInButton";
import EmailAuthForm from "./EmailAuthForm";

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
  if (user) {
    const destination = await getPostLoginDestination(supabase, user.id, redirectTo);
    redirect(destination);
  }
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
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
        <EmailAuthForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { getPostLoginDestination } from "@/lib/authPostLoginDestination";
import SignInButton from "./SignInButton";
import EmailAuthForm from "./EmailAuthForm";
import Image from "next/image";

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
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
          <Image src="/KroweIcon.png" alt="Krowe" width={18} height={18} className="rounded-sm" />
          <span className="text-xs font-semibold text-foreground">Krowe Platform</span>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h1 className="serif-text text-2xl font-bold text-foreground">Decision Engine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access your interview workspace.
          </p>
          {error && (
            <p className="mb-4 mt-4 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
              Sign-in failed. Please try again.
            </p>
          )}
          <div className="mt-6">
            <SignInButton redirectTo={redirectTo} />
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <EmailAuthForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-dvh bg-zinc-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src="/KroweLogo.png" alt="Krowe" className="h-10 w-auto" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-zinc-900">Sign in to Krowe</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Access your interview projects and insights
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-600">Sign-in failed. Please try again.</p>
            </div>
          )}

          <div className="space-y-3">
            <SignInButton redirectTo={redirectTo} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs text-zinc-400 uppercase tracking-wider">
                  or
                </span>
              </div>
            </div>

            <EmailAuthForm redirectTo={redirectTo} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          © 2026 Krowe Technologies Inc.
        </p>
      </div>
    </div>
  );
}

"use client";
import { createBrowserClient } from "@supabase/ssr";

export default function SignInButton() {
  async function handleGoogleSignIn() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }
  return (
    <button
      onClick={handleGoogleSignIn}
      className="w-full px-4 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
    >
      Continue with Google
    </button>
  );
}

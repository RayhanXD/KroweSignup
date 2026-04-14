"use client";
import { createBrowserClient } from "@supabase/ssr";

function resolveCallbackOrigin() {
  const envOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();

  if (process.env.NODE_ENV !== "production" && envOrigin) {
    try {
      const parsed = new URL(envOrigin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // Fall back to the browser origin when env origin is malformed.
    }
  }

  return window.location.origin;
}

export default function SignInButton({ redirectTo }: { redirectTo?: string }) {
  async function handleGoogleSignIn() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const callbackOrigin = resolveCallbackOrigin();
    const callbackUrl = redirectTo
      ? `${callbackOrigin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`
      : `${callbackOrigin}/api/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  }
  return (
    <button
      onClick={handleGoogleSignIn}
      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-foreground/5 transition-colors"
    >
      Continue with Google
    </button>
  );
}

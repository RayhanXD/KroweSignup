"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function EmailAuthForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getPostLoginDestination(next?: string) {
    const qp = next?.startsWith("/") ? `?next=${encodeURIComponent(next)}` : "";
    const res = await fetch(`/api/auth/post-login-destination${qp}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to resolve post-login destination");
    const json = await res.json();
    if (!json?.destination || typeof json.destination !== "string") {
      throw new Error("Invalid post-login destination response");
    }
    return json.destination;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setLoading(false);
        setError(signInError.message);
      } else {
        try {
          const destination = await getPostLoginDestination(redirectTo);
          setLoading(false);
          router.push(destination);
        } catch (destinationError: unknown) {
          setLoading(false);
          setError(getErrorMessage(destinationError, "Unable to determine where to send you."));
        }
      }
    } else {
      const origin = window.location.origin;
      const callbackUrl = `${origin}/api/auth/callback`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
      } else if (signUpData.session) {
        try {
          const destination = await getPostLoginDestination(redirectTo);
          router.push(destination);
        } catch (destinationError: unknown) {
          setError(getErrorMessage(destinationError, "Unable to determine where to send you."));
        }
      } else {
        setMessage("Check your email to confirm your account.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
      />
      {mode === "signup" && (
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
          autoComplete="new-password"
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
      >
        {loading ? "Please wait..." : mode === "signin" ? "Sign in with Email" : "Create Account"}
      </button>
      <p className="text-xs text-center text-muted-foreground">
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
              className="underline hover:text-foreground"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setMessage(null); }}
              className="underline hover:text-foreground"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}

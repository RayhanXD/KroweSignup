"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SpiralPreloader from "@/app/components/SpiralPreloader";
import Image from "next/image";

export default function UrlOnboardingStartClient() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/signup/session/start", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to start session");

        if (!cancelled) {
          setSessionId(json.sessionId);
          setLoadingSession(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to start session");
          setLoadingSession(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sessionId || !url.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/signup/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, url: url.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to analyze this URL");

      router.push(`/signup/url/review?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze this URL");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpiralPreloader className="animate-fade-in" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-soft">
        <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-1.5">
          <Image src="/KroweIcon.png" alt="Krowe" width={16} height={16} className="rounded-sm" />
          <span className="text-[11px] font-semibold text-foreground">Krowe onboarding</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Paste your website URL to skip onboarding</h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground">
          We will analyze your site and prefill your onboarding answers. You can review and edit everything before generating your report.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Website URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !sessionId}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Analyzing..." : "Analyze My Business"}
            </button>

            <Link
              href="/signup"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Fill in manually instead
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

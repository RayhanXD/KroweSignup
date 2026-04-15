"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const MIN_TRANSCRIPT_CHARS = 100;

export default function AddInterviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const charCount = transcript.trim().length;
  const hasValidTranscript = charCount >= MIN_TRANSCRIPT_CHARS;

  async function handleContinue() {
    setError(null);
    if (!hasValidTranscript) {
      setError(`Transcript must be at least ${MIN_TRANSCRIPT_CHARS} characters.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/interviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          rawText: transcript.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit interview.");
      }
      router.push(`/interviews/${projectId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
        <aside className="border-r border-border/60 bg-[color-mix(in_srgb,var(--surface-subtle)_75%,white)] p-3">
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 py-2">
            <Image src="/KroweIcon.png" alt="Krowe" width={20} height={20} className="rounded-sm" />
            <div>
              <p className="text-xs font-semibold text-foreground">Krowe</p>
              <p className="text-[10px] text-muted-foreground">Interview intake</p>
            </div>
          </div>
          <nav className="space-y-1.5">
            <Link href="/interviews" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-background hover:text-foreground">
              <span className="material-symbols-outlined text-base">home</span>
              Home
            </Link>
            <Link href={`/interviews/${projectId}`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-background hover:text-foreground">
              <span className="material-symbols-outlined text-base">workspaces</span>
              Workspace
            </Link>
            <div className="flex items-center gap-2 rounded-lg bg-interview-brand-tint/70 px-2.5 py-2 text-sm font-medium text-interview-brand">
              <span className="material-symbols-outlined text-base">add_circle</span>
              Add Interview
            </div>
          </nav>
        </aside>

        <div className="px-4 pb-24 pt-4 sm:px-5">
          <header className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5">
              <Image src="/KroweIcon.png" alt="Krowe" width={16} height={16} className="rounded-sm" />
              <span className="text-[11px] font-semibold text-foreground">Krowe ingestion</span>
            </div>
            <Link href={`/interviews/${projectId}`} className="text-xs text-muted-foreground hover:underline">
              Back to project
            </Link>
          </header>

          <div className="mx-auto max-w-[620px]">
            <main>
              <section className="mb-5">
                <h1 className="serif-text mb-1.5 text-[24px] font-bold leading-[1.15] tracking-tight text-foreground sm:text-[26px]">
                  Upload your <span className="text-primary">interviews</span>.
                </h1>
                <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                  Add your audio recordings or transcripts. Krowe will distill them into structured
                  insights and decisions.
                </p>
              </section>

              <section className="mb-5">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Paste Transcript
                  </h3>
                  <span
                    className={`text-[11px] ${
                      hasValidTranscript ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {charCount} / {MIN_TRANSCRIPT_CHARS} chars minimum
                  </span>
                </div>
                <textarea
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Paste the full interview transcript here..."
                  className="min-h-[260px] w-full rounded-2xl border border-border/60 bg-card p-3.5 text-xs leading-relaxed text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  This is the active ingestion path right now. Once submitted, this creates one
                  interview entry in your project.
                </p>
              </section>

              {error && <p className="mb-3 text-xs text-danger">{error}</p>}
            </main>
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t border-border/40 py-3 z-10">
        <div className="mx-auto flex max-w-[620px] items-center justify-between gap-3 px-4 sm:px-5">
          <button
            type="button"
            onClick={() => router.push(`/interviews/${projectId}`)}
            className="text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors px-2 py-1.5"
          >
            Skip for now
          </button>
          <button
            type="button"
            disabled={loading || !hasValidTranscript}
            onClick={handleContinue}
            className="bg-gradient-to-br from-interview-brand to-interview-brand-end text-primary-foreground text-xs px-4 py-1.5 rounded-full font-bold shadow-md shadow-interview-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
          >
            {loading ? "Working…" : "Continue to Insights"}
          </button>
        </div>
      </footer>
    </div>
  );
}

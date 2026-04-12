"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
      <div className="max-w-[520px] mx-auto px-4 sm:px-5 pt-4">
        <div className="mb-3">
          <Link
            href={`/interviews/${projectId}`}
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Back to project
          </Link>
        </div>

        <main className="pb-24">
          <section className="mb-5">
            <h1 className="serif-text text-[24px] sm:text-[26px] leading-[1.15] font-bold text-foreground mb-1.5 tracking-tight">
              Upload your <span className="text-primary">interviews</span>.
            </h1>
            <p className="text-muted-foreground text-xs max-w-md leading-relaxed">
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
                  hasValidTranscript ? "text-green-700" : "text-muted-foreground"
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
              className="w-full min-h-[190px] rounded-2xl border border-border/60 bg-white p-3.5 text-xs leading-relaxed text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              This is the active ingestion path right now. Once submitted, this creates one
              interview entry in your project.
            </p>
          </section>

          <section className="mb-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Upload Files
              </h3>
              <span className="text-[11px] font-medium text-amber-700">Coming soon</span>
            </div>
            <div
              className="w-full min-h-[155px] py-5 bg-muted/30 border-2 border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center opacity-70"
            >
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm mb-2.5">
                <span className="material-symbols-outlined text-primary text-[20px]">cloud_upload</span>
              </div>
              <h3 className="font-semibold text-xs mb-0.5 text-foreground">Drop files here</h3>
              <p className="text-muted-foreground text-[11px]">MP3, WAV, or PDF up to 50MB</p>
              <div className="mt-3">
                <button
                  type="button"
                  disabled
                  className="px-3 py-1 bg-white border border-border/80 rounded-full text-[11px] font-semibold shadow-sm text-foreground cursor-not-allowed opacity-70"
                >
                  Browse Files
                </button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                File upload is not available yet. Paste transcript above for now.
              </p>
            </div>
          </section>

          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border/40 py-3 z-10">
        <div className="max-w-[520px] mx-auto px-4 sm:px-5 flex items-center justify-between gap-3">
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
            className="bg-gradient-to-br from-[#FF6A4D] to-[#FF5733] text-white text-xs px-4 py-1.5 rounded-full font-bold shadow-md shadow-primary/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
          >
            {loading ? "Working…" : "Continue to Insights"}
          </button>
        </div>
      </footer>
    </div>
  );
}

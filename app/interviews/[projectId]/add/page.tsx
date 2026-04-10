"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function AddInterviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = rawText.trim().length;
  const isValid = charCount >= 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      setError("Interview must be at least 100 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/interviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, rawText: rawText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit interview");
        return;
      }
      router.push(`/interviews/${projectId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link
          href={`/interviews/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-8"
        >
          ← Back to project
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-zinc-900">Add interview</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Paste a raw transcript. The AI will extract and structure the insights.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the full interview transcript here…"
                rows={16}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors resize-y"
              />
              <div className="flex items-center justify-between mt-2">
                <span
                  className={`text-xs ${
                    isValid
                      ? "text-zinc-400"
                      : charCount > 0
                      ? "text-red-500"
                      : "text-zinc-400"
                  }`}
                >
                  {charCount.toLocaleString()} characters{!isValid && " · 100 minimum"}
                </span>
                {isValid && (
                  <span className="text-xs font-medium text-green-600">Ready to submit</span>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting…" : "Submit interview"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

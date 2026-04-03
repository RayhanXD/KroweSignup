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
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href={`/interviews/${projectId}`} className="text-sm text-muted-foreground hover:underline">
            ← Back to project
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2">Add Interview</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Paste a raw interview transcript. The AI will extract and structure it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste the full interview transcript here..."
              rows={16}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-y font-mono"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span
                className={`text-xs ${
                  isValid ? "text-muted-foreground" : charCount > 0 ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {charCount} / 100 characters minimum
              </span>
              {isValid && (
                <span className="text-xs text-green-600">Ready to submit</span>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full px-4 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit interview"}
          </button>
        </form>
      </div>
    </div>
  );
}

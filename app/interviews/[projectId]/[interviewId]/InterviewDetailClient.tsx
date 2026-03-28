"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { summaryToBullets } from "@/lib/interviews/formatSummary";

interface TopQuote {
  type: string;
  text: string;
  quote?: string;
  intensity?: number;
  displayQuote: string;
}

interface Segment {
  type: "pain" | "context" | "emotion" | "intensity";
  text: string;
  quote?: string;
  intensity?: number;
}

interface Interview {
  id: string;
  raw_text: string;
  status: string;
  created_at: string;
  structured_segments: unknown;
}

interface Props {
  interview: Interview;
  projectId: string;
  summary: string | null;
  topQuotes: TopQuote[];
  painCount: number;
  structuredSegments: Segment[] | null;
}

function segmentColor(type: string): string {
  switch (type) {
    case "pain":      return "border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900";
    case "emotion":   return "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900";
    case "context":   return "border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900";
    case "intensity": return "border-purple-200 bg-purple-50/60 dark:bg-purple-950/20 dark:border-purple-900";
    default:          return "border-border bg-muted/20";
  }
}

type TranscriptTab = "raw" | "structured";

export default function InterviewDetailClient({
  interview,
  projectId,
  summary,
  topQuotes,
  painCount,
  structuredSegments,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(interview.raw_text);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [transcriptTab, setTranscriptTab] = useState<TranscriptTab>("raw");

  const charCount = editText.trim().length;
  const isValid = charCount >= 100;

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: editText }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Failed to save");
        return;
      }
      setEditText(editText.trim());
      setIsEditing(false);
      router.refresh();
    } catch {
      setSaveError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditText(interview.raw_text);
    setIsEditing(false);
    setSaveError(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-2 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: transcript */}
          <div className="lg:col-span-7">
            <div className="mb-6">
              <Link
                href={`/interviews/${projectId}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                ← Back to project
              </Link>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Interview</h1>
                <p className="text-sm text-muted-foreground">
                  Submitted on{" "}
                  {new Date(interview.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    interview.status === "structured"
                      ? "bg-green-100 text-green-700"
                      : interview.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {interview.status}
                </span>
                {!isEditing && (
                  <button
                    onClick={() => { setIsEditing(true); setTranscriptTab("raw"); }}
                    className="text-xs px-3 py-1 rounded border border-border hover:bg-muted transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full h-[500px] border border-border rounded-xl p-6 bg-muted/20 text-sm font-mono text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center justify-between mt-2">
                  <span
                    className={`text-xs ${
                      isValid ? "text-muted-foreground" : "text-red-500 font-medium"
                    }`}
                  >
                    {charCount} characters{!isValid && " (minimum 100)"}
                  </span>
                  <div className="flex items-center gap-2">
                    {saveError && (
                      <span className="text-xs text-red-500">{saveError}</span>
                    )}
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="text-xs px-3 py-1 rounded border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!isValid || saving}
                      className="text-xs px-3 py-1 rounded bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {interview.status === "structured" && structuredSegments && (
                  <div className="flex gap-1 mb-4 border-b border-border">
                    {(["raw", "structured"] as TranscriptTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setTranscriptTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
                          transcriptTab === tab
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                )}

                {transcriptTab === "raw" && (
                  <div className="border border-border rounded-xl p-6 bg-muted/20">
                    <pre className="text-sm whitespace-pre-wrap font-mono text-foreground leading-relaxed">
                      {editText}
                    </pre>
                  </div>
                )}

                {transcriptTab === "structured" && structuredSegments && (
                  <div className="flex flex-col gap-3">
                    {structuredSegments.map((seg, i) => (
                      <div key={i} className={`border rounded-xl p-4 ${segmentColor(seg.type)}`}>
                        <span className="text-[10px] font-semibold uppercase tracking-wide mb-2 block opacity-70">
                          {seg.type}
                        </span>
                        <p className="text-sm leading-relaxed">{seg.text}</p>
                        {seg.quote && seg.quote !== seg.text && (
                          <p className="text-xs italic mt-2 opacity-80">&ldquo;{seg.quote}&rdquo;</p>
                        )}
                        {seg.intensity && seg.intensity >= 4 && (
                          <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide text-red-600">
                            High intensity
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: summary sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Summary Hero Card */}
            <div className="border border-border rounded-xl p-6 bg-card">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Interview Summary
              </h2>

              {interview.status !== "structured" ? (
                <p className="text-sm text-muted-foreground italic">
                  Analysis pending — run the pipeline to generate a summary.
                </p>
              ) : summary ? (
                <>
                  <ul className="text-sm text-foreground leading-relaxed mb-4 space-y-1.5 list-disc list-inside">
                    {summaryToBullets(summary).map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                  {painCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3 mt-3">
                      <span className="font-medium text-foreground">
                        {painCount}
                      </span>{" "}
                      pain point{painCount !== 1 ? "s" : ""} identified
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No summary available.
                </p>
              )}
            </div>

            {/* Strong Signals */}
            <div className="border border-border rounded-xl p-6 bg-card">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Strong Signals
              </h2>
              {interview.status !== "structured" || topQuotes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {interview.status !== "structured"
                    ? "Analysis pending — run the pipeline to extract quotes."
                    : "No strong quotes found in this interview."}
                </p>
              ) : (
                <div className="flex flex-row gap-2">
                  {topQuotes.map((q, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 flex-1">
                      <p className="text-sm italic leading-relaxed text-foreground/90">
                        &ldquo;{q.displayQuote}&rdquo;
                      </p>
                      {q.intensity && q.intensity >= 4 && (
                        <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide text-red-600">
                          High intensity
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

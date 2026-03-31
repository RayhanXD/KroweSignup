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

interface ExtractedProblem {
  problem_text: string;
  root_cause: string;
  customer_type: string;
  confidence: number;
  supporting_quote: string;
  intensity_score: number;
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
  interviewNumber: number | null;
  structuredSegments: Segment[] | null;
  extractedProblems: ExtractedProblem[];
  intervieweeName: string | null;
  intervieweeContext: string | null;
  competitorMentions: string[];
  currentMethods: string[];
}

function segmentBorder(type: string): string {
  switch (type) {
    case "pain":      return "border-l-2 border-red-400";
    case "emotion":   return "border-l-2 border-amber-400";
    case "context":   return "border-l-2 border-blue-400";
    case "intensity": return "border-l-2 border-purple-400";
    default:          return "border-l-2 border-border";
  }
}

function segmentLabelColor(type: string): string {
  switch (type) {
    case "pain":      return "text-red-500";
    case "emotion":   return "text-amber-500";
    case "context":   return "text-blue-500";
    case "intensity": return "text-purple-500";
    default:          return "text-muted-foreground";
  }
}

function confidenceBadge(score: number): { label: string; classes: string } {
  if (score >= 0.75) return { label: "High", classes: "bg-green-100 text-green-700" };
  if (score >= 0.5)  return { label: "Medium", classes: "bg-amber-100 text-amber-700" };
  return { label: "Low", classes: "bg-gray-100 text-gray-500" };
}

function ProblemCard({ problem: p }: { problem: ExtractedProblem }) {
  const badge = confidenceBadge(p.confidence);
  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <p className="text-sm font-medium text-foreground leading-snug">{p.problem_text}</p>
      {p.root_cause && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Root Cause</span>
          <p className="text-xs text-foreground/80 mt-0.5">{p.root_cause}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {p.customer_type && (
          <span className="text-xs text-muted-foreground">{p.customer_type}</span>
        )}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.classes}`}>
          {badge.label} confidence
        </span>
      </div>
      {p.supporting_quote && (
        <p className="text-xs italic text-foreground/70 border-l-2 border-border pl-3 mt-1">
          &ldquo;{p.supporting_quote}&rdquo;
        </p>
      )}
    </div>
  );
}

function extractIntervieweeName(rawText: string): string | null {
  const lines = rawText.split("\n").slice(0, 20);
  const patterns = [
    /^(?:interviewee|participant|name|subject)\s*:\s*(.+)/i,
  ];
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return match[1].trim();
    }
  }
  return null;
}

type TranscriptTab = "raw" | "structured";

export default function InterviewDetailClient({
  interview,
  projectId,
  summary,
  topQuotes,
  painCount,
  interviewNumber,
  structuredSegments,
  extractedProblems,
  intervieweeName,
  intervieweeContext,
  competitorMentions,
  currentMethods,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(interview.raw_text);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [transcriptTab, setTranscriptTab] = useState<TranscriptTab>("raw");
  const [segmentFilter, setSegmentFilter] = useState<"all" | "pain" | "emotion" | "context" | "intensity">("all");
  const [problemsOpen, setProblemsOpen] = useState(false);

  // Interviewee card state
  const [nameCardEditing, setNameCardEditing] = useState(false);
  const [nameInput, setNameInput] = useState(intervieweeName ?? "");
  const [contextInput, setContextInput] = useState(intervieweeContext ?? "");
  const [savedName, setSavedName] = useState(intervieweeName);
  const [savedContext, setSavedContext] = useState(intervieweeContext);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  function handleStartNameEdit() {
    // Auto-suggest from transcript if no saved name
    if (!savedName) {
      const extracted = extractIntervieweeName(interview.raw_text);
      if (extracted && !nameInput) setNameInput(extracted);
    }
    setNameCardEditing(true);
    setNameError(null);
  }

  async function handleNameSave() {
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await fetch(`/api/interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intervieweeName: nameInput.trim() || null,
          intervieweeContext: contextInput.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setNameError(data.error ?? "Failed to save");
        return;
      }
      setSavedName(nameInput.trim() || null);
      setSavedContext(contextInput.trim() || null);
      setNameCardEditing(false);
    } catch {
      setNameError("Network error — please try again");
    } finally {
      setNameSaving(false);
    }
  }

  function handleNameCancel() {
    setNameInput(savedName ?? "");
    setContextInput(savedContext ?? "");
    setNameCardEditing(false);
    setNameError(null);
  }

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

  const filteredSegments = segmentFilter === "all"
    ? structuredSegments
    : structuredSegments?.filter(s => s.type === segmentFilter);

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
                <h1 className="text-2xl font-bold mb-1">
                  {savedName ?? (interviewNumber ? `Interview #${interviewNumber}` : "Interview")}
                </h1>
                {savedContext && (
                  <p className="text-sm text-muted-foreground mb-0.5">{savedContext}</p>
                )}
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
                        onClick={() => { setTranscriptTab(tab); if (tab === "raw") setSegmentFilter("all"); }}
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
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {(["all", "pain", "emotion", "context", "intensity"] as const).map((f) => {
                      const activeStyles: Record<typeof f, string> = {
                        all:       "bg-gray-100 text-gray-700",
                        pain:      "bg-red-50 text-red-600",
                        emotion:   "bg-amber-50 text-amber-600",
                        context:   "bg-blue-50 text-blue-600",
                        intensity: "bg-purple-50 text-purple-600",
                      };
                      const isActive = segmentFilter === f;
                      return (
                        <button
                          key={f}
                          onClick={() => setSegmentFilter(f)}
                          className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                            isActive
                              ? activeStyles[f]
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                )}

                {transcriptTab === "structured" && structuredSegments && (
                  <div className="border border-border rounded-xl p-6 bg-muted/20">
                    <div className="text-sm font-mono text-foreground leading-relaxed space-y-4">
                      {(filteredSegments ?? []).map((seg, i) => (
                        <div key={i} className={`pl-3 ${segmentBorder(seg.type)}`}>
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${segmentLabelColor(seg.type)}`}>
                            {seg.type}{seg.intensity && seg.intensity >= 4 ? " · high intensity" : ""}
                          </span>
                          <p className="mt-0.5 whitespace-pre-wrap">{seg.text}</p>
                          {seg.quote && seg.quote !== seg.text && (
                            <p className="text-xs italic mt-1 opacity-70">&ldquo;{seg.quote}&rdquo;</p>
                          )}
                        </div>
                      ))}
                      {(filteredSegments ?? []).length === 0 && (
                        <p className="text-muted-foreground italic text-xs">No {segmentFilter} segments found.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: summary sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Interviewee Card */}
            {nameCardEditing ? (
              <div className="border border-border rounded-xl p-4 bg-card space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interviewee Info</p>
                <input
                  type="text"
                  placeholder="Name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <textarea
                  placeholder="Context (role, company, background…)"
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  {nameError && <span className="text-xs text-red-500 mr-auto">{nameError}</span>}
                  <button
                    onClick={handleNameCancel}
                    disabled={nameSaving}
                    className="text-xs px-3 py-1 rounded border border-border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNameSave}
                    disabled={nameSaving}
                    className="text-xs px-3 py-1 rounded bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {nameSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : savedName ? (
              <div className="border border-border rounded-xl p-4 bg-card flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{savedName}</p>
                  {savedContext && (
                    <p className="text-xs text-muted-foreground mt-0.5">{savedContext}</p>
                  )}
                </div>
                <button
                  onClick={handleStartNameEdit}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                  title="Edit interviewee info"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartNameEdit}
                className="w-full border border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-2"
              >
                <span className="text-base leading-none">+</span>
                Add interviewee info
              </button>
            )}

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

            {/* Extracted Problems */}
            <div className="border border-border rounded-xl p-6 bg-card">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Extracted Problems
              </h2>
              {interview.status !== "structured" || extractedProblems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {interview.status !== "structured"
                    ? "Analysis pending — run the pipeline to extract problems."
                    : "No problems extracted from this interview."}
                </p>
              ) : (
                <div>
                  <ProblemCard problem={extractedProblems[0]} />
                  {extractedProblems.length > 1 && (
                    <button
                      onClick={() => setProblemsOpen(true)}
                      className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all {extractedProblems.length} problems →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Competitors Mentioned */}
            <div className="border border-border rounded-xl p-6 bg-card">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Competitors Mentioned
              </h2>
              {interview.status !== "structured" ? (
                <p className="text-sm text-muted-foreground italic">
                  Analysis pending — run the pipeline to detect competitors.
                </p>
              ) : competitorMentions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No competitors mentioned in this interview.
                </p>
              ) : (
                <div className="space-y-2">
                  {competitorMentions.map((mention, i) => (
                    <div key={i} className="border border-border rounded-lg px-3 py-2.5 bg-muted/20">
                      <p className="text-xs italic text-foreground/80 leading-relaxed">
                        &ldquo;{mention}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current / Alternative Methods */}
            <div className="border border-border rounded-xl p-6 bg-card">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Current Methods Used
              </h2>
              {interview.status !== "structured" ? (
                <p className="text-sm text-muted-foreground italic">
                  Analysis pending — run the pipeline to detect current methods.
                </p>
              ) : currentMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No current methods or workarounds mentioned.
                </p>
              ) : (
                <div className="space-y-2">
                  {currentMethods.map((method, i) => (
                    <div key={i} className="border border-border rounded-lg px-3 py-2.5 bg-muted/20">
                      <p className="text-xs italic text-foreground/80 leading-relaxed">
                        &ldquo;{method}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {problemsOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setProblemsOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-background border-l border-border z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                All Extracted Problems ({extractedProblems.length})
              </h2>
              <button
                onClick={() => setProblemsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {extractedProblems.map((p, i) => (
                <ProblemCard key={i} problem={p} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
    <div className="bg-white p-4 rounded-xl border border-zinc-100 flex flex-col gap-3 shadow-sm hover:border-primary/20 transition-colors">
      <div className="flex justify-between items-center">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
          !
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.classes}`}>
          {Math.round(p.confidence * 100)}%
        </span>
      </div>
      <div>
        <h3 className="font-bold text-xs text-on-surface mb-1">{p.problem_text}</h3>
        {p.root_cause && (
          <p className="text-[10px] text-zinc-500 leading-tight">{p.root_cause}</p>
        )}
      </div>
      {p.supporting_quote && (
        <p className="text-[10px] italic text-foreground/70 border-l-2 border-zinc-200 pl-2 mt-1">
          &ldquo;{p.supporting_quote}&rdquo;
        </p>
      )}
      <div className="text-[10px] text-zinc-500">
        {p.customer_type || "Unspecified customer"}
      </div>
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

  const createdAtText = new Date(interview.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-surface text-on-surface">
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex flex-col min-h-[calc(100vh-5rem)]">
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            <section className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <Link
                    href={`/interviews/${projectId}`}
                    className="inline-block text-sm text-muted-foreground hover:underline mb-5"
                  >
                    ← Back to project
                  </Link>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-3xl lg:text-4xl font-bold text-on-surface tracking-tight leading-[1.1]">
                      Transcription &amp; Raw Logs
                    </h1>
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setTranscriptTab("raw");
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 transition-colors"
                      >
                        Edit transcript
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 font-medium bg-surface-container-low p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span>Interviewee:</span>
                      <span className="text-on-surface font-semibold">
                        {savedName ?? (interviewNumber ? `Interview #${interviewNumber}` : "Unknown")}
                      </span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-zinc-300" />
                    <div className="flex items-center gap-2">
                      <span>{createdAtText}</span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-zinc-300" />
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{interview.status}</span>
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full h-[500px] border border-zinc-200 rounded-xl p-6 bg-zinc-50 text-sm font-mono text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${isValid ? "text-muted-foreground" : "text-red-500 font-medium"}`}>
                        {charCount} characters{!isValid && " (minimum 100)"}
                      </span>
                      <div className="flex items-center gap-2">
                        {saveError && <span className="text-xs text-red-500">{saveError}</span>}
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
                  <div className="space-y-4 text-base leading-relaxed text-on-surface-variant">
                    {interview.status === "structured" && structuredSegments && (
                      <div className="flex gap-1 mb-4 border-b border-zinc-200">
                        {(["raw", "structured"] as TranscriptTab[]).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => {
                              setTranscriptTab(tab);
                              if (tab === "raw") setSegmentFilter("all");
                            }}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
                              transcriptTab === tab
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    )}

                    {transcriptTab === "raw" && (
                      <div className="border border-zinc-200 rounded-xl p-6 bg-white">
                        <pre className="text-sm whitespace-pre-wrap font-mono text-foreground leading-relaxed">
                          {editText}
                        </pre>
                      </div>
                    )}

                    {transcriptTab === "structured" && structuredSegments && (
                      <>
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {(["all", "pain", "emotion", "context", "intensity"] as const).map((f) => {
                            const activeStyles: Record<typeof f, string> = {
                              all: "bg-gray-100 text-gray-700",
                              pain: "bg-red-50 text-red-600",
                              emotion: "bg-amber-50 text-amber-600",
                              context: "bg-blue-50 text-blue-600",
                              intensity: "bg-purple-50 text-purple-600",
                            };
                            const isActive = segmentFilter === f;
                            return (
                              <button
                                key={f}
                                onClick={() => setSegmentFilter(f)}
                                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                                  isActive ? activeStyles[f] : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {f}
                              </button>
                            );
                          })}
                        </div>
                        <div className="border border-zinc-200 rounded-xl p-6 bg-white">
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
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="w-full lg:w-[640px] bg-[#f8f3f2] p-6 lg:p-10 overflow-y-auto no-scrollbar border-l border-zinc-100">
              <div className="space-y-10">
                <div>
                  <h2 className="text-2xl font-bold text-on-surface mb-6">AI Summary</h2>
                  <div className="bg-white p-6 rounded-xl space-y-4 shadow-sm border border-zinc-100/50">
                    {nameCardEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
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
                        </div>
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
                    ) : (
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-surface-container-low p-3 rounded-lg border border-zinc-100">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Founder Name</h4>
                          <p className="text-sm font-bold text-on-surface">
                            {savedName ?? "Not set"}
                          </p>
                        </div>
                        <div className="bg-surface-container-low p-3 rounded-lg border border-zinc-100">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Founder Context</h4>
                          <p className="text-xs text-on-surface-variant leading-tight">
                            {savedContext ?? "No interviewee context added yet."}
                          </p>
                        </div>
                        <button
                          onClick={handleStartNameEdit}
                          className="col-span-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                        >
                          Edit interviewee info
                        </button>
                      </div>
                    )}

                    {interview.status !== "structured" ? (
                      <p className="text-sm text-muted-foreground italic">
                        Analysis pending — run the pipeline to generate a summary.
                      </p>
                    ) : summary ? (
                      <ul className="space-y-3">
                        {summaryToBullets(summary).map((point, i) => (
                          <li key={i} className="flex gap-3 text-sm leading-relaxed">
                            <span className="text-primary font-bold">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                        {painCount > 0 && (
                          <li className="text-xs text-zinc-500">
                            {painCount} pain point{painCount !== 1 ? "s" : ""} identified.
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No summary available.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-on-surface mb-6">Strong Signals</h2>
                  <div className="bg-white/50 rounded-2xl border border-zinc-100 p-6 shadow-sm">
                    {interview.status !== "structured" || topQuotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        {interview.status !== "structured"
                          ? "Analysis pending — run the pipeline to extract quotes."
                          : "No strong quotes found in this interview."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {topQuotes.map((q, i) => (
                          <div key={i} className="bg-primary/5 p-6 rounded-xl border border-primary/10 shadow-sm flex flex-col justify-between min-h-[140px]">
                            <p className="italic text-on-surface text-base leading-relaxed mb-4">
                              &ldquo;{q.displayQuote}&rdquo;
                            </p>
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                              {q.intensity && q.intensity >= 4 ? "High Intensity" : "Signal"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-on-surface mb-6">Extracted Problems</h2>
                  {interview.status !== "structured" || extractedProblems.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      {interview.status !== "structured"
                        ? "Analysis pending — run the pipeline to extract problems."
                        : "No problems extracted from this interview."}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {extractedProblems.slice(0, 2).map((problem, i) => (
                          <ProblemCard key={i} problem={problem} />
                        ))}
                      </div>
                      {extractedProblems.length > 1 && (
                        <button
                          onClick={() => setProblemsOpen(true)}
                          className="mt-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          View all {extractedProblems.length} problems →
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-on-surface mb-6">Alternatives Found</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-lg border border-zinc-100 shadow-sm flex flex-col">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Current Methods</h4>
                      {interview.status !== "structured" ? (
                        <p className="text-sm text-muted-foreground italic">
                          Analysis pending — run the pipeline to detect current methods.
                        </p>
                      ) : currentMethods.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No current methods or workarounds mentioned.
                        </p>
                      ) : (
                        <div className="space-y-3 flex-1">
                          {currentMethods.map((method, i) => (
                            <div key={i} className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-on-surface truncate">{method}</span>
                                <span className="text-[9px] font-black text-on-surface bg-surface-container px-1 py-0.5 rounded-sm">
                                  Mentioned
                                </span>
                              </div>
                              <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-container w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-zinc-100 shadow-sm flex flex-col">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Competitors</h4>
                      {interview.status !== "structured" ? (
                        <p className="text-sm text-muted-foreground italic">
                          Analysis pending — run the pipeline to detect competitors.
                        </p>
                      ) : competitorMentions.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No competitors mentioned in this interview.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {competitorMentions.map((mention, i) => (
                            <span key={i} className="px-2 py-1 bg-white border border-zinc-100 shadow-sm text-[10px] font-bold rounded text-on-surface">
                              {mention}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
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

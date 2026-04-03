"use client";

import { useEffect, useState } from "react";
import type { InterviewScript } from "@/lib/interviews/generateScript";

export function InterviewScriptTab({ projectId }: { projectId: string }) {
  const [script, setScript] = useState<InterviewScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Interviewer info form
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerContext, setInterviewerContext] = useState("");
  const [savingInterviewer, setSavingInterviewer] = useState(false);
  const [interviewerSaved, setInterviewerSaved] = useState(false);

  async function fetchScript(regenerate = false) {
    if (regenerate) setRegenerating(true);
    else setLoading(true);
    setError(null);
    try {
      const url = regenerate
        ? `/api/interviews/script/${projectId}?regenerate=true`
        : `/api/interviews/script/${projectId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to load script");
        return;
      }
      const data = await res.json();
      setScript(data as InterviewScript);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  async function fetchInterviewerInfo() {
    try {
      const res = await fetch(`/api/interviews/project/${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.project?.interviewer_name) setInterviewerName(data.project.interviewer_name);
      if (data.project?.interviewer_context) setInterviewerContext(data.project.interviewer_context);
    } catch {
      // ignore
    }
  }

  async function handleSaveInterviewer() {
    setSavingInterviewer(true);
    try {
      const res = await fetch(`/api/interviews/project/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewer_name: interviewerName,
          interviewer_context: interviewerContext,
        }),
      });
      if (!res.ok) return;
      setInterviewerSaved(true);
      setTimeout(() => setInterviewerSaved(false), 2000);
      // Regenerate script with new interviewer info
      fetchScript(true);
    } catch {
      // ignore
    } finally {
      setSavingInterviewer(false);
    }
  }

  useEffect(() => {
    fetchInterviewerInfo();
    fetchScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function buildPlainText(s: InterviewScript): string {
    const lines: string[] = [];
    lines.push(s.intro);
    lines.push("");
    for (const section of s.sections) {
      lines.push(`--- ${section.title} ---`);
      lines.push("");
      for (const q of section.questions) {
        lines.push(`Q: ${q.question}`);
        for (const probe of q.probes) {
          lines.push(`  → ${probe}`);
        }
        lines.push("");
      }
    }
    lines.push(s.closing);
    return lines.join("\n");
  }

  async function handleCopy() {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(buildPlainText(script));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
        <p className="text-sm">Generating your interview script…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={() => fetchScript()}
          className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!script) return null;

  return (
    <div className="max-w-2xl">
      {/* Interviewer Info */}
      <div className="mb-6 border border-border rounded-xl p-5 bg-card">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Interviewer Info</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Your name</label>
            <input
              type="text"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">About you / context <span className="text-muted-foreground/50">(optional)</span></label>
            <textarea
              value={interviewerContext}
              onChange={(e) => setInterviewerContext(e.target.value)}
              placeholder="e.g. Former teacher researching edtech tools for K-12 classrooms"
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <button
            onClick={handleSaveInterviewer}
            disabled={savingInterviewer || regenerating}
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            {savingInterviewer ? "Saving…" : interviewerSaved ? "Saved!" : "Save & Regenerate Script"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold">Interview Script</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            A tailored guide for your customer discovery calls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchScript(true)}
            disabled={regenerating}
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors shrink-0"
          >
            {copied ? "Copied!" : "Copy Script"}
          </button>
        </div>
      </div>

      {/* Intro */}
      <div className="mb-6 border border-border rounded-xl p-5 bg-card">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Opening</p>
        <p className="text-sm text-foreground leading-relaxed">{script.intro}</p>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {script.sections.map((section, si) => (
          <div key={si} className="border border-border rounded-xl p-5 bg-card">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              {section.title}
            </p>
            <div className="space-y-5">
              {section.questions.map((q, qi) => (
                <div key={qi}>
                  <p className="text-sm font-medium text-foreground leading-snug mb-2">
                    {q.question}
                  </p>
                  <ul className="space-y-1">
                    {q.probes.map((probe, pi) => (
                      <li key={pi} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-muted-foreground/50 shrink-0 mt-0.5">→</span>
                        <span>{probe}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Closing */}
      <div className="mt-5 border border-border rounded-xl p-5 bg-card">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Closing</p>
        <p className="text-sm text-foreground leading-relaxed">{script.closing}</p>
      </div>
    </div>
  );
}

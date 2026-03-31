"use client";

import { useEffect, useState } from "react";
import type { InterviewScript } from "@/lib/interviews/generateScript";

export function InterviewScriptTab({ projectId }: { projectId: string }) {
  const [script, setScript] = useState<InterviewScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchScript() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/script/${projectId}`);
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
    }
  }

  useEffect(() => {
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
          onClick={fetchScript}
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold">Interview Script</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            A tailored guide for your customer discovery calls.
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors shrink-0"
        >
          {copied ? "Copied!" : "Copy Script"}
        </button>
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

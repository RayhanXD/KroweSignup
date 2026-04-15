"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectForm({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const nameLength = trimmedName.length;
  const titleQuality =
    nameLength === 0
      ? "Add a project title to continue."
      : nameLength < 8
        ? "Consider a slightly more descriptive title."
        : "Strong title. This is specific enough to track."
  const titleQualityTone =
    nameLength === 0
      ? "text-muted-foreground"
      : nameLength < 8
        ? "text-[color-mix(in_srgb,var(--muted-foreground)_88%,transparent)]"
        : "text-interview-brand";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!trimmedName) {
      setError("Project name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/interviews/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, sessionId: sessionId.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        return;
      }
      router.push(`/interviews/${data.projectId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Build Brief
        </p>
        <h3 className="text-xl font-semibold leading-tight text-foreground">Project details</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Give your research project a name
          {isAdmin ? " and optionally link it to a Krowe signup session" : ""}. This title anchors
          interviews, synthesis, and decision outputs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-lg border border-border/60 bg-card">
          <div className="border-b border-border/60 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Project Identity
            </p>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="name">
                Project name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SaaS onboarding for independent consultants"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-interview-brand/25"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className={`text-xs ${titleQualityTone}`}>{titleQuality}</p>
                <span className="text-[11px] text-muted-foreground">{nameLength}/72</span>
              </div>
              {!trimmedName && error && <p className="mt-1 text-xs text-danger">Project name is required.</p>}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Preview
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                {trimmedName || "Untitled research project"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This will appear in project lists, decision outputs, and activity logs.
              </p>
            </div>
          </div>
        </section>

        {isAdmin && (
          <section className="rounded-lg border border-border/60 bg-card">
            <div className="border-b border-border/60 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Context Bridge
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="sessionId">
                  Krowe session ID <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="sessionId"
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Link a Krowe session for additional AI context"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-interview-brand/25"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Linking a session can improve downstream spec generation by grounding insights in known
                business context.
              </p>
            </div>
          </section>
        )}

        <section className="rounded-lg border border-border/60 bg-card">
          <div className="border-b border-border/60 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Next
            </p>
          </div>
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm text-foreground">
              After creation, you will enter the project workspace and can begin adding interviews
              immediately.
            </p>
            {error && (
              <div className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-gradient-to-br from-interview-brand to-interview-brand-end px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Creating workspace..." : "Create project"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setName("");
                  setSessionId("");
                  setError(null);
                }}
                disabled={loading}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
              >
                Reset draft
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

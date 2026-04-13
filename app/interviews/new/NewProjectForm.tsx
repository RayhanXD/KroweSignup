"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProjectForm({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/interviews/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sessionId: sessionId.trim() || undefined }),
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
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/interviews" className="text-sm text-muted-foreground hover:underline">
            ← Back to projects
          </Link>
        </div>

        <h1 className="serif-text text-[24px] sm:text-[26px] font-bold tracking-tight leading-[1.15] text-foreground mb-2">
          New Project
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Give your research project a name{isAdmin ? " and optionally link it to a Krowe signup session" : ""}.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="name">
              Project name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SaaS tool for freelancers"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-interview-brand/15"
            />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="sessionId">
                Krowe session ID{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="sessionId"
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Link to your Krowe session ID"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-interview-brand/15"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Linking a session gives the AI context about your idea when generating the product spec.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-full bg-gradient-to-br from-interview-brand to-interview-brand-end text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create project"}
          </button>
        </form>
      </div>
    </div>
  );
}

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
    <div className="min-h-dvh bg-zinc-50">
      <div className="mx-auto max-w-lg px-4 py-16">
        <Link
          href="/interviews"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-8"
        >
          ← All projects
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-zinc-900">New project</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Give your research project a name{isAdmin ? " and optionally link a Krowe session" : ""}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5" htmlFor="name">
                Project name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SaaS tool for freelancers"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
                autoFocus
              />
            </div>

            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5" htmlFor="sessionId">
                  Krowe session ID{" "}
                  <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  id="sessionId"
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Paste your Krowe session ID"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-colors"
                />
                <p className="mt-1.5 text-xs text-zinc-400">
                  Linking a session gives the AI context about your idea when generating the product spec.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create project"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

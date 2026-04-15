"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  status: string;
};

type InboxItem = {
  id: string;
  external_note_id: string;
  title: string | null;
  transcript_preview: string;
  summary_text: string | null;
  owner_name: string | null;
  owner_email: string | null;
  granola_created_at: string | null;
  granola_updated_at: string;
  attendees: Array<{ name: string | null; email: string }>;
  normalized_text: string;
};

type Connection = {
  id: string;
  status: "active" | "invalid" | "disabled";
  key_hint: string | null;
  last_sync_completed_at: string | null;
  last_error: string | null;
} | null;

type Props = {
  initialItems: InboxItem[];
  projects: Project[];
  initialConnection: Connection;
};

type SyncResult = {
  scanned: number;
  upserted: number;
  skipped: number;
  fullResync: boolean;
};

export function ImportsClient({ initialItems, projects, initialConnection }: Props) {
  const [connection, setConnection] = useState<Connection>(initialConnection);
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const content = `${item.title ?? ""} ${item.summary_text ?? ""} ${item.transcript_preview}`.toLowerCase();
      return content.includes(term);
    });
  }, [items, query]);

  async function connectGranola(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    setBusy("connect");
    try {
      const res = await fetch("/api/integrations/granola/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to connect Granola");
        return;
      }
      setApiKey("");
      await refreshConnection();
    } finally {
      setBusy(null);
    }
  }

  async function refreshConnection() {
    const res = await fetch("/api/integrations/granola/connection", { cache: "no-store" });
    const data = await res.json();
    setConnection(data.connection ?? null);
  }

  async function syncNow() {
    setError(null);
    setSyncResult(null);
    setBusy("sync");
    try {
      const res = await fetch("/api/integrations/granola/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullResync: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sync failed");
        return;
      }
      setSyncResult({
        scanned: Number(data.scanned ?? 0),
        upserted: Number(data.upserted ?? 0),
        skipped: Number(data.skipped ?? 0),
        fullResync: Boolean(data.fullResync),
      });
      await Promise.all([refreshConnection(), refreshItems()]);
    } finally {
      setBusy(null);
    }
  }

  async function refreshItems() {
    const res = await fetch("/api/interviews/imports?status=unassigned", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setItems(data.items ?? []);
  }

  async function disconnect() {
    setError(null);
    setBusy("disconnect");
    try {
      const res = await fetch("/api/integrations/granola/connection", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Disconnect failed");
        return;
      }
      setConnection((prev) => (prev ? { ...prev, status: "disabled" } : prev));
    } finally {
      setBusy(null);
    }
  }

  async function assign(itemId: string, projectId: string) {
    setError(null);
    setBusy(itemId);
    try {
      const res = await fetch(`/api/interviews/imports/${itemId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Assignment failed");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-50">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Granola Imports</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review synced transcripts and assign each one to a Krowe project.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/interviews"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Back to projects
            </Link>
            {connection?.status === "active" && (
              <button
                onClick={syncNow}
                disabled={busy === "sync"}
                className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {busy === "sync" ? "Syncing..." : "Full resync"}
              </button>
            )}
          </div>
        </div>

        {!connection || connection.status !== "active" ? (
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">Connect Granola</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Add your Granola API key to sync transcript notes into this inbox.
            </p>
            <form onSubmit={connectGranola} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="grn_..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              />
              <button
                type="submit"
                disabled={busy === "connect"}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {busy === "connect" ? "Connecting..." : "Connect"}
              </button>
            </form>
          </section>
        ) : (
          <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  Connected key: {connection.key_hint ?? "saved"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Last sync:{" "}
                  {connection.last_sync_completed_at
                    ? new Date(connection.last_sync_completed_at).toLocaleString()
                    : "Not yet synced"}
                </p>
                {connection.last_error && (
                  <p className="mt-2 text-xs text-red-600">Last error: {connection.last_error}</p>
                )}
              </div>
              <button
                onClick={disconnect}
                disabled={busy === "disconnect"}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          </section>
        )}

        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, summary, or transcript preview"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        {syncResult && (
          <div className="mb-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
            {syncResult.fullResync ? "Full resync complete" : "Sync complete"}: scanned{" "}
            {syncResult.scanned}, imported {syncResult.upserted}, skipped {syncResult.skipped}.
            {syncResult.scanned === 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                Granola returned no API-eligible notes for this key. Granola only returns notes that
                have generated summaries/transcripts and are visible to the API key owner.
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          {filteredItems.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
              No unassigned transcripts found.
            </div>
          )}

          {filteredItems.map((item) => (
            <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-zinc-900">
                    {item.title || "Untitled interview"}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Updated {new Date(item.granola_updated_at).toLocaleString()} by{" "}
                    {item.owner_name || item.owner_email || "Unknown owner"}
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <select
                    defaultValue=""
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) return;
                      void assign(item.id, value);
                      e.currentTarget.value = "";
                    }}
                    disabled={busy === item.id || projects.length === 0}
                  >
                    <option value="">
                      {projects.length > 0 ? "Assign to project..." : "Create project first"}
                    </option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-3 text-sm text-zinc-700">{item.transcript_preview}</p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-zinc-600">
                  View transcript and details
                </summary>
                <div className="mt-2 space-y-2 rounded-lg bg-zinc-50 p-3">
                  {item.summary_text && (
                    <p className="text-sm text-zinc-700">
                      <span className="font-medium">Summary:</span> {item.summary_text}
                    </p>
                  )}
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs text-zinc-700">
                    {item.normalized_text}
                  </pre>
                </div>
              </details>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

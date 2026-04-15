"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DashboardPageHeader from "../_components/DashboardPageHeader";

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
    <div className="space-y-4">
      <DashboardPageHeader
        title="Granola Imports"
        description="Review synced transcripts and assign each one to a Krowe project."
        actions={
          <>
            <Link
              href="/interviews"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
            >
              Back to Home
            </Link>
            {connection?.status === "active" && (
              <button
                onClick={syncNow}
                disabled={busy === "sync"}
                className="rounded-full bg-gradient-to-br from-interview-brand to-interview-brand-end px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {busy === "sync" ? "Syncing..." : "Full resync"}
              </button>
            )}
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
          <p className="text-xs text-muted-foreground">Connection status</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {connection?.status === "active" ? "Connected" : "Disconnected"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {connection?.key_hint ? `Key ${connection.key_hint}` : "No API key linked"}
          </p>
        </article>
        <article className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
          <p className="text-xs text-muted-foreground">Pending imports</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{items.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Unassigned transcript notes</p>
        </article>
        <article className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
          <p className="text-xs text-muted-foreground">Project targets</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{projects.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {projects.length > 0 ? "Available assignment destinations" : "Create a project to assign"}
          </p>
        </article>
        <article className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
          <p className="text-xs text-muted-foreground">Last sync</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {connection?.last_sync_completed_at
              ? new Date(connection.last_sync_completed_at).toLocaleString()
              : "Not synced yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Run full resync to refresh all notes</p>
        </article>
      </section>

      {!connection || connection.status !== "active" ? (
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-4 border-b border-border/60 pb-3">
            <h2 className="text-base font-semibold text-foreground">Connect Granola</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your Granola API key to sync transcript notes into this inbox.
            </p>
          </div>
          <form onSubmit={connectGranola} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="grn_..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interview-brand/35"
            />
            <button
              type="submit"
              disabled={busy === "connect"}
              className="rounded-lg bg-gradient-to-br from-interview-brand to-interview-brand-end px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {busy === "connect" ? "Connecting..." : "Connect"}
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Connected key: {connection.key_hint ?? "saved"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last sync:{" "}
                {connection.last_sync_completed_at
                  ? new Date(connection.last_sync_completed_at).toLocaleString()
                  : "Not yet synced"}
              </p>
              {connection.last_error && (
                <p className="mt-2 rounded-md border border-danger/40 bg-danger-soft px-2 py-1 text-xs text-danger">
                  Last error: {connection.last_error}
                </p>
              )}
            </div>
            <button
              onClick={disconnect}
              disabled={busy === "disconnect"}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <div className="mb-3 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Import queue</p>
            <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {filteredItems.length} visible / {items.length} total
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Search transcripts then assign each interview note to a project.</p>
        </div>
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, summary, or transcript preview"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interview-brand/35"
          />
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {syncResult && (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground">
          {syncResult.fullResync ? "Full resync complete" : "Sync complete"}: scanned {syncResult.scanned},
          imported {syncResult.upserted}, skipped {syncResult.skipped}.
          {syncResult.scanned === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Granola returned no API-eligible notes for this key. Granola only returns notes that have
              generated summaries/transcripts and are visible to the API key owner.
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {filteredItems.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
            <p>No unassigned transcripts found.</p>
            {projects.length === 0 && (
              <p className="mt-1">
                Create a project in{" "}
                <Link href="/interviews/projects" className="font-semibold text-foreground hover:underline">
                  Projects
                </Link>{" "}
                so imported notes can be assigned.
              </p>
            )}
          </div>
        )}

        {filteredItems.map((item) => (
          <article key={item.id} className="rounded-xl border border-border/60 bg-card p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">
                  {item.title || "Untitled interview"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {new Date(item.granola_updated_at).toLocaleString()} by{" "}
                  {item.owner_name || item.owner_email || "Unknown owner"}
                </p>
              </div>
              <div className="w-full sm:w-64">
                <select
                  defaultValue=""
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interview-brand/35"
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

            <p className="mt-3 text-sm text-foreground/90">{item.transcript_preview}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                View transcript and details
              </summary>
              <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-muted/25 p-3">
                {item.summary_text && (
                  <p className="text-sm text-foreground/90">
                    <span className="font-medium">Summary:</span> {item.summary_text}
                  </p>
                )}
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs text-foreground/90">
                  {item.normalized_text}
                </pre>
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}

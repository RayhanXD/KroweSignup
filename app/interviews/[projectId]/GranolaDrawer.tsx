"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type GranolaInboxItem = {
  id: string;
  title: string | null;
  owner_name: string | null;
  owner_email: string | null;
  granola_updated_at: string;
  transcript_preview: string;
};

export type AssignedGranolaItem = {
  id: string;
  title: string | null;
  owner_name: string | null;
  granola_updated_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  items: GranolaInboxItem[];
  assignedItems: AssignedGranolaItem[];
  connectionActive: boolean;
  lastSyncAt: string | null;
};

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (ms < min) return "just now";
  if (ms < hour) return `${Math.floor(ms / min)}m ago`;
  if (ms < day) return `${Math.floor(ms / hour)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function GranolaDrawer({
  open,
  onClose,
  projectId,
  items,
  assignedItems,
  connectionActive,
  lastSyncAt,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"new" | "imported">("new");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((i) => i.id))
  );
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = tab === "new" ? items : assignedItems;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);
    try {
      await fetch("/api/integrations/granola/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullResync: false }),
      });
      router.refresh();
    } catch {
      setError("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function importSelected() {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);
    const ids = Array.from(selected);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/interviews/imports/${id}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
          })
        )
      );
      router.refresh();
      onClose();
    } catch {
      setError("One or more imports failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-card border-l border-border/60 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/60 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-interview-brand-tint text-sm font-bold text-interview-brand">
                Gr
              </div>
              <h2 className="text-sm font-semibold text-foreground">Granola imports</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Krowe auto-discovers new Granola notes tagged{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">#krowe</code>{" "}
              or filed in{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">Customer Interviews</code>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-5 py-2 text-xs text-muted-foreground">
          <span
            className={`material-symbols-outlined text-base ${
              connectionActive ? "text-success" : "text-warning"
            }`}
          >
            {connectionActive ? "check_circle" : "warning"}
          </span>
          <span>
            {connectionActive ? "Connected to Granola" : "Granola not connected"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {lastSyncAt && (
              <span className="text-muted-foreground">
                Synced {formatRelativeTime(lastSyncAt)}
              </span>
            )}
            <button
              onClick={syncNow}
              disabled={syncing || !connectionActive}
              className="flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-background transition-colors disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[13px] ${syncing ? "animate-spin" : ""}`}>
                refresh
              </span>
              Sync now
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/60 px-5">
          <button
            onClick={() => setTab("new")}
            className={`mr-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === "new"
                ? "border-interview-brand text-interview-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            New <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">{items.length}</span>
          </button>
          <button
            onClick={() => setTab("imported")}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === "imported"
                ? "border-interview-brand text-interview-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Already imported <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">{assignedItems.length}</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-2">
          <span className="text-xs text-muted-foreground">
            {tab === "new"
              ? `${items.length} new notes ready`
              : `${assignedItems.length} previously imported`}
          </span>
          {tab === "new" && items.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-foreground hover:text-interview-brand transition-colors"
            >
              {selected.size === items.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {list.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {tab === "new"
                ? "No new notes in your Granola inbox."
                : "No notes have been imported to this project yet."}
            </div>
          ) : (
            list.map((item) => {
              const isChecked = tab === "new" && selected.has(item.id);
              const name = item.title || item.owner_name || "Untitled";
              const initial = name.trim().charAt(0).toUpperCase();
              return (
                <div
                  key={item.id}
                  onClick={() => tab === "new" && toggle(item.id)}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-border/40 transition-colors ${
                    tab === "new" ? "cursor-pointer hover:bg-muted/30" : ""
                  } ${isChecked ? "bg-interview-brand-tint/30" : ""}`}
                >
                  {tab === "new" && (
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                        isChecked
                          ? "border-interview-brand bg-interview-brand text-white"
                          : "border-border bg-background"
                      }`}
                    >
                      {isChecked && (
                        <span className="material-symbols-outlined text-[13px] leading-none">check</span>
                      )}
                    </div>
                  )}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      {tab === "new" && (
                        <span className="shrink-0 rounded-full bg-interview-brand-tint px-1.5 py-0.5 text-[10px] font-bold text-interview-brand">
                          auto-detected
                        </span>
                      )}
                      {tab === "imported" && (
                        <span className="shrink-0 rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">
                          Imported
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.granola_updated_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          {tab === "new" ? (
            <>
              <span className="text-xs text-muted-foreground">
                <strong className="text-foreground">{selected.size}</strong> of {items.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={importSelected}
                  disabled={selected.size === 0 || importing}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-interview-brand to-interview-brand-end px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  {importing
                    ? "Importing..."
                    : `Import ${selected.size > 0 ? `${selected.size} note${selected.size > 1 ? "s" : ""}` : ""}`}
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              {assignedItems.length} in this project
            </span>
          )}
        </div>
      </div>
    </>
  );
}

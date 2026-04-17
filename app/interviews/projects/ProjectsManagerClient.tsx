"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type DashboardProject = {
  id: string;
  name: string;
  status: "collecting" | "processing" | "ready" | "failed";
  interview_count: number;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialProjects: DashboardProject[];
  isAdmin?: boolean;
};

export function ProjectsManagerClient({ initialProjects, isAdmin = false }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<DashboardProject[]>(initialProjects);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveRename(projectId: string) {
    setError(null);
    const nextName = editName.trim();
    if (!nextName) {
      setError("Project name cannot be empty.");
      return;
    }

    setBusyId(projectId);
    try {
      const res = await fetch(`/api/interviews/project/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to rename project.");
      }

      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, name: data.project?.name ?? nextName } : project,
        ),
      );
      setEditingId(null);
      setEditName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename project.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProject(projectId: string) {
    setError(null);
    const confirmed = window.confirm(
      "Permanently delete this project? This cannot be undone and will remove all interviews and data."
    );
    if (!confirmed) return;

    setBusyId(projectId);
    try {
      const res = await fetch(`/api/interviews/project/${projectId}?permanent=true`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete project.");
      }

      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project.");
    } finally {
      setBusyId(null);
    }
  }

  async function archiveProject(projectId: string) {
    setError(null);
    const confirmed = window.confirm("Archive this project? You can no longer access it from the main dashboard.");
    if (!confirmed) return;

    setBusyId(projectId);
    try {
      const res = await fetch(`/api/interviews/project/${projectId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to archive project.");
      }

      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive project.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card">
      {error && (
        <div className="border-b border-border/60 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {projects.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No active projects. Create one to get started.
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {projects.map((project) => {
            const isEditing = editingId === project.id;
            const isBusy = busyId === project.id;
            return (
              <div key={project.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-interview-brand/35"
                      placeholder="Project name"
                    />
                  ) : (
                    <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {project.interview_count} interviews • Created{" "}
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/interviews/${project.id}`}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
                  >
                    Open
                  </Link>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void saveRename(project.id)}
                        className="rounded-full bg-gradient-to-br from-interview-brand to-interview-brand-end px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingId(null);
                          setEditName("");
                        }}
                        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(project.id);
                        setEditName(project.name);
                      }}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      Rename
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void archiveProject(project.id)}
                    className="rounded-full border border-danger/40 px-3 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
                  >
                    {isBusy ? "Archiving..." : "Archive"}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void deleteProject(project.id)}
                      className="rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-danger/80 disabled:opacity-60"
                    >
                      {isBusy ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

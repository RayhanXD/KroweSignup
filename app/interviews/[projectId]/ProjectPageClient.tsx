"use client";

import { useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { RunAnalysisButton } from "./RunAnalysisButton";
import { InterviewScriptTab } from "./InterviewScriptTab";

type Interview = {
  id: string;
  status: "pending" | "structured" | "failed";
  created_at: string;
  interviewee_name: string | null;
  interviewee_context: string | null;
};

type Project = {
  id: string;
  name: string;
  status: "collecting" | "processing" | "ready" | "failed";
  interview_count: number;
  created_at: string;
  updated_at: string;
  session_id: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  collecting: { label: "Collecting", dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
  processing: { label: "Processing", dot: "bg-amber-500 animate-pulse", text: "text-amber-700", bg: "bg-amber-50" },
  ready: { label: "Ready", dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
  failed: { label: "Failed", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  pending: { label: "Pending", dot: "bg-zinc-400", text: "text-zinc-500", bg: "bg-zinc-50" },
  structured: { label: "Structured", dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.text} ${cfg.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

type Tab = "interviews" | "script";

type Props = {
  project: Project;
  interviews: Interview[];
  projectId: string;
};

export function ProjectPageClient({ project, interviews, projectId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("interviews");

  const needsMore = project.interview_count < 3 && project.interview_count > 0;
  const remaining = 3 - project.interview_count;

  return (
    <div className="min-h-dvh bg-zinc-50 flex flex-col">
      <AppHeader backHref="/interviews" backLabel="Projects" />

      <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-0">
        {/* Project header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-semibold text-zinc-900">{project.name}</h1>
              <StatusPill status={project.status} />
            </div>
            <p className="text-sm text-zinc-500">
              {project.interview_count} interview{project.interview_count !== 1 ? "s" : ""} collected
            </p>
          </div>

          {project.status === "ready" && (
            <Link
              href={`/interviews/${projectId}/decision`}
              className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              View decision →
            </Link>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-zinc-200">
          {(["interviews", "script"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {tab === "script" ? "Interview Script" : "Interviews"}
            </button>
          ))}
        </div>
      </div>

      {/* Interviews tab */}
      {activeTab === "interviews" && (
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-700">
              {interviews.length > 0
                ? `${interviews.length} interview${interviews.length !== 1 ? "s" : ""}`
                : "No interviews yet"}
            </h2>
            <div className="flex items-center gap-2">
              <RunAnalysisButton
                projectId={projectId}
                interviewCount={project.interview_count}
                projectStatus={project.status}
              />
              <Link
                href={`/interviews/${projectId}/add`}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
              >
                + Add interview
              </Link>
            </div>
          </div>

          {interviews.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
              <p className="text-sm font-medium text-zinc-700 mb-1">No interviews yet</p>
              <p className="text-sm text-zinc-400 mb-4">Add at least 3 to run analysis.</p>
              <Link
                href={`/interviews/${projectId}/add`}
                className="inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                Add your first interview
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                {interviews.map((interview, i) => (
                  <Link
                    key={interview.id}
                    href={`/interviews/${projectId}/${interview.id}`}
                    className={`flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors ${
                      i < interviews.length - 1 ? "border-b border-zinc-100" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {interview.interviewee_name ?? `Interview #${i + 1}`}
                      </p>
                      {interview.interviewee_context && (
                        <p className="text-xs text-zinc-400 truncate max-w-xs">
                          {interview.interviewee_context}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-xs text-zinc-400">
                        {new Date(interview.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <StatusPill status={interview.status} />
                    </div>
                  </Link>
                ))}
              </div>

              {needsMore && (
                <p className="mt-3 text-sm text-zinc-400">
                  Add {remaining} more interview{remaining !== 1 ? "s" : ""} to enable analysis.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Script tab */}
      {activeTab === "script" && (
        <div className="flex flex-1 min-h-0">
          <InterviewScriptTab projectId={projectId} />
        </div>
      )}
    </div>
  );
}

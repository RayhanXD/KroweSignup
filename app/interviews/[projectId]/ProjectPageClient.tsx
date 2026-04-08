"use client";

import { useState } from "react";
import Link from "next/link";
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    collecting: "bg-blue-100 text-blue-700",
    processing: "bg-yellow-100 text-yellow-700",
    ready: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-600",
    structured: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status === "processing" && (
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      )}
      {status}
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Constrained header section */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-0">
        {/* Back link */}
        <div className="mb-6">
          <Link href="/interviews" className="text-sm text-muted-foreground hover:underline">
            ← All projects
          </Link>
        </div>

        {/* Project header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {project.interview_count} interview{project.interview_count !== 1 ? "s" : ""} collected
            </p>
          </div>
          {project.status === "ready" && (
            <Link
              href={`/interviews/${projectId}/decision`}
              className="shrink-0 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              View Decision →
            </Link>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {(["interviews", "script"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "script" ? "Interview Script" : "Interviews"}
            </button>
          ))}
        </div>
      </div>

      {/* Interviews tab — constrained */}
      {activeTab === "interviews" && (
        <div className="max-w-3xl mx-auto px-4 pb-10 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Interviews</h2>
            <div className="flex items-center gap-3">
              <RunAnalysisButton
                projectId={projectId}
                interviewCount={project.interview_count}
                projectStatus={project.status}
              />
              <Link
                href={`/interviews/${projectId}/add`}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                + Add Interview
              </Link>
            </div>
          </div>

          {interviews.length === 0 ? (
            <div className="border border-border rounded-xl p-8 text-center text-muted-foreground">
              <p className="text-sm">No interviews yet. Add at least 3 to run analysis.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {interviews.map((interview, i) => (
                <Link
                  key={interview.id}
                  href={`/interviews/${projectId}/${interview.id}`}
                  className="flex items-center justify-between border border-border rounded-lg px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      {interview.interviewee_name ?? `Interview #${i + 1}`}
                    </span>
                    {interview.interviewee_context && (
                      <span className="text-xs text-muted-foreground truncate max-w-xs">
                        {interview.interviewee_context}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(interview.created_at).toLocaleDateString()}
                    </span>
                    <StatusBadge status={interview.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {project.interview_count < 3 && project.interview_count > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Add {3 - project.interview_count} more interview{3 - project.interview_count !== 1 ? "s" : ""} to enable analysis.
            </p>
          )}
        </div>
      )}

      {/* Script tab — full width */}
      {activeTab === "script" && (
        <div className="flex flex-1 min-h-0">
          <InterviewScriptTab projectId={projectId} />
        </div>
      )}
    </div>
  );
}

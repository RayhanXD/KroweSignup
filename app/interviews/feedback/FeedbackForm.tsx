"use client";

import { useMemo, useState, type FormEvent } from "react";

type ProjectOption = {
  id: string;
  name: string;
};

type Props = {
  projects: ProjectOption[];
};

type RecommendAnswer = "yes" | "not_yet";

const CATEGORY_OPTIONS = [
  "Bug",
  "Feature Request",
  "Workflow Friction",
  "Data Quality",
  "Performance",
  "Other",
] as const;

const RECOMMEND_OPTIONS: { value: RecommendAnswer; label: string }[] = [
  { value: "yes", label: "Yes, I would recommend it today" },
  { value: "not_yet", label: "Not yet, it needs improvement first" },
];

export default function FeedbackForm({ projects }: Props) {
  const [category, setCategory] = useState<string>("");
  const [rating, setRating] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [whatHappened, setWhatHappened] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<RecommendAnswer | "">("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      Boolean(
        category &&
          rating !== null &&
          whatHappened.trim()
      ),
    [category, rating, whatHappened]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setSuccess(null);

    if (!canSubmit || rating === null) {
      setError("Please complete every required field before submitting feedback.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/interviews/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating,
          message: message.trim(),
          pagePath: window.location.pathname,
          projectId: projectId || null,
          details: {
            whatHappened: whatHappened.trim(),
            wouldRecommend: wouldRecommend || null,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.saved) {
          setWarning(
            "Your feedback was saved, but notification failed after retry. Please try submitting again in a minute."
          );
          return;
        }
        setError(data?.error ?? "Could not submit feedback.");
        return;
      }

      setSuccess("Feedback submitted. The Krowe team has been notified.");
      setCategory("");
      setRating(null);
      setProjectId("");
      setWhatHappened("");
      setWouldRecommend("");
      setMessage("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-foreground">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-interview-brand/25"
              required
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="projectId" className="mb-1.5 block text-sm font-medium text-foreground">
              Project context <span className="text-muted-foreground">(optional)</span>
            </label>
            <select
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-interview-brand/25"
            >
              <option value="">No specific project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Overall experience rating <span className="text-danger">*</span>
          </label>
          <span className="text-xs text-muted-foreground">1 = rough, 5 = excellent</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = rating === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`h-10 w-10 rounded-full border text-sm font-semibold transition-colors ${
                  active
                    ? "border-interview-brand/60 bg-interview-brand-tint text-interview-brand"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={active}
              >
                {value}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card px-4 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Specific Questions
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="whatHappened" className="mb-1.5 block text-sm font-medium text-foreground">
              What happened? <span className="text-danger">*</span>
            </label>
            <textarea
              id="whatHappened"
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              rows={3}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-interview-brand/25"
              placeholder="Describe the exact workflow moment and what you saw."
            />
          </div>

          <div>
            <label htmlFor="wouldRecommend" className="mb-1.5 block text-sm font-medium text-foreground">
              Would you recommend Krowe today?{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <select
              id="wouldRecommend"
              value={wouldRecommend}
              onChange={(e) => setWouldRecommend(e.target.value as RecommendAnswer)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-interview-brand/25"
            >
              <option value="">Select answer</option>
              {RECOMMEND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card px-4 py-4">
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-foreground">
          Additional notes for the team{" "}
          <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-interview-brand/25"
          placeholder="Anything else we should know?"
        />
      </section>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {warning && (
        <div className="rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-sm text-foreground">
          {warning}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {success}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="rounded-full bg-gradient-to-br from-interview-brand to-interview-brand-end px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {loading ? "Submitting feedback..." : "Submit feedback"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

type OnboardingAnswer = {
  value: unknown;
  finalSource: string | null;
  confirmedAt: string | null;
};

type BusinessProfileResponse = {
  meta: {
    source: "onboarding";
    answerCount: number;
  };
  onboarding: {
    mode: "manual" | "webscraper" | null;
    completedAt: string | null;
    sourceUrl: string | null;
    sourceUpdatedAt: string | null;
  };
  answers: Record<string, OnboardingAnswer>;
};

function formatDateTime(value: string | null): string {
  if (!value) return "Not completed";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "Not completed";
  return d.toLocaleString();
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((v) => String(v)).join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  return String(value);
}

function Row({ label, answer }: { label: string; answer?: OnboardingAnswer }) {
  const source = answer?.finalSource ?? "—";
  return (
    <div className="rounded-xl border border-border/60 bg-background px-3 py-2.5 space-y-1">
      <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground leading-relaxed break-words">{renderValue(answer?.value)}</p>
      <p className="text-[10px] text-muted-foreground">Source: {source}</p>
    </div>
  );
}

export function BusinessProfileTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<BusinessProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrlInput, setSourceUrlInput] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/project/${projectId}/business-profile`);
      const payload = (await res.json()) as BusinessProfileResponse & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load onboarding profile");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load onboarding profile");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.onboarding.sourceUrl) return;
    setSourceUrlInput(data.onboarding.sourceUrl);
  }, [data?.onboarding.sourceUrl]);

  async function handleScrape() {
    const normalized = sourceUrlInput.trim();
    if (!normalized) {
      setScrapeMessage("Enter a website URL first.");
      return;
    }

    setScrapeMessage(null);
    setScraping(true);
    try {
      const res = await fetch(`/api/interviews/project/${projectId}/business-profile/onboarding-url`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to scrape website.");
      }
      setScrapeMessage("Website analyzed. Business Profile was updated from your site.");
      await load();
    } catch (err) {
      setScrapeMessage(err instanceof Error ? err.message : "Failed to scrape website.");
    } finally {
      setScraping(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 max-w-[1240px] mx-auto w-full px-4 md:px-5 pb-16 mt-10">
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          Loading onboarding profile…
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex-1 max-w-[1240px] mx-auto w-full px-4 md:px-5 pb-16 mt-10">
        <div className="rounded-2xl border border-danger/40 bg-danger-soft p-6 text-sm text-danger">
          {error ?? "Unable to load onboarding profile."}
        </div>
      </main>
    );
  }

  const answers = data.answers;

  return (
    <main className="flex-1 max-w-[1240px] mx-auto w-full px-4 md:px-5 pb-16 mt-10 space-y-6">
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="serif-text text-lg sm:text-xl font-bold text-foreground tracking-tight">
            Business Profile
          </h2>
          <p className="text-xs text-muted-foreground">
            This tab reflects your onboarding answers only.
          </p>
          <p className="text-[11px] text-muted-foreground">
            {data.meta.answerCount} onboarding field{data.meta.answerCount === 1 ? "" : "s"} detected
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              data.onboarding.completedAt
                ? "bg-success-soft text-success border-success/40"
                : "bg-warning-soft text-warning border-warning/40"
            }`}
          >
            <span className="material-symbols-outlined text-[13px] leading-none">
              {data.onboarding.completedAt ? "check_circle" : "pending"}
            </span>
            {data.onboarding.completedAt
              ? `Onboarding complete (${data.onboarding.mode ?? "manual"})`
              : "Onboarding incomplete"}
          </span>
          <p className="text-[11px] text-muted-foreground">{formatDateTime(data.onboarding.completedAt)}</p>
        </div>
      </section>

      {error && (
        <section className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Website Scrape</h3>
          <p className="text-xs text-muted-foreground">
            Web scraping can replace manual onboarding. Running this updates your Business Profile and marks onboarding complete.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="url"
            value={sourceUrlInput}
            onChange={(event) => setSourceUrlInput(event.target.value)}
            placeholder="https://yourcompany.com"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => void handleScrape()}
            disabled={scraping}
            className="rounded-lg border border-border/70 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {scraping ? "Analyzing..." : "Analyze / Regenerate"}
          </button>
        </div>
        {data.onboarding.sourceUrl && (
          <p className="text-[11px] text-muted-foreground break-all">
            Current source URL: {data.onboarding.sourceUrl}
          </p>
        )}
        {scrapeMessage && (
          <p className="text-[11px] text-muted-foreground">{scrapeMessage}</p>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft space-y-3">
          <h3 className="text-sm font-semibold">Founder + Problem</h3>
          <Row label="Idea" answer={answers.idea} />
          <Row label="Problem" answer={answers.problem} />
          <Row label="Target Customer" answer={answers.target_customer} />
          <Row label="Startup Stage" answer={answers.startup_stage} />
          <Row label="Industry" answer={answers.industry} />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft space-y-3">
          <h3 className="text-sm font-semibold">Product + Market</h3>
          <Row label="Product Type" answer={answers.product_type} />
          <Row label="Features" answer={answers.features} />
          <Row label="Competitors" answer={answers.competitors} />
          <Row label="Alternatives" answer={answers.alternatives} />
          <Row label="Pricing Model" answer={answers.pricing_model} />
          <Row label="Interview Count Goal" answer={answers.interview_count} />
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SpiralPreloader from "@/app/components/SpiralPreloader";
import {
  normalizeUrlOnboardingDraft,
  type PricingModel,
  type UrlOnboardingDraft,
  type IndustryId,
  type StartupStage,
} from "@/lib/signup/urlOnboarding";

const PRICING_OPTIONS: PricingModel[] = [
  "free",
  "freemium",
  "subscription",
  "one_time",
  "usage_based",
  "marketplace",
  "enterprise",
];

const INDUSTRY_OPTIONS: IndustryId[] = [
  "edtech",
  "fintech",
  "health",
  "ecommerce",
  "saas",
  "marketplace",
  "creator",
  "other",
];

const STAGE_OPTIONS: StartupStage[] = [
  "idea",
  "validation",
  "pre-mvp",
  "mvp",
  "early-traction",
  "growth",
];

function toListValue(value: string[]): string {
  return value.join("\n");
}

function fromListValue(value: string): string[] {
  return value
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function UrlOnboardingReviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<UrlOnboardingDraft | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!sessionId) {
        setError("Missing sessionId");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/signup/scrape?sessionId=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load extracted answers");

        if (!cancelled) {
          setDraft(normalizeUrlOnboardingDraft(json.draft || {}));
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load extracted answers");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const featuresValue = useMemo(() => toListValue(draft?.features ?? []), [draft?.features]);
  const competitorsValue = useMemo(() => toListValue(draft?.competitors ?? []), [draft?.competitors]);
  const alternativesValue = useMemo(() => toListValue(draft?.alternatives ?? []), [draft?.alternatives]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpiralPreloader className="animate-fade-in" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-danger">{error ?? "Unable to load review data."}</p>
          <Link href="/signup" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to signup
          </Link>
        </div>
      </div>
    );
  }

  async function onGenerateReport() {
    if (!sessionId || saving) return;

    setSaving(true);
    setError(null);

    try {
      const saveRes = await fetch("/api/signup/scrape", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, draft }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson?.error || "Failed to save edited answers");

      const completeRes = await fetch("/api/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const completeJson = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeJson?.error || "Failed to complete signup");

      router.replace("/interviews");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete signup");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-foreground">Review extracted onboarding answers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update anything that looks off, then generate your report.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2 block">
            <span className="text-sm font-medium text-foreground">Idea</span>
            <textarea
              value={draft.idea}
              onChange={(e) => setDraft((s) => (s ? { ...s, idea: e.target.value } : s))}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Product type</span>
            <select
              value={draft.product_type}
              onChange={(e) => setDraft((s) => (s ? { ...s, product_type: e.target.value as UrlOnboardingDraft["product_type"] } : s))}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="mobile">mobile</option>
              <option value="web">web</option>
              <option value="both">both</option>
              <option value="other">other</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Startup stage</span>
            <select
              value={draft.startup_stage}
              onChange={(e) => setDraft((s) => (s ? { ...s, startup_stage: e.target.value as StartupStage } : s))}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2 block">
            <span className="text-sm font-medium text-foreground">Features (comma or new line separated)</span>
            <textarea
              value={featuresValue}
              onChange={(e) => setDraft((s) => (s ? { ...s, features: fromListValue(e.target.value) } : s))}
              rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="md:col-span-2 block">
            <span className="text-sm font-medium text-foreground">Problem</span>
            <textarea
              value={draft.problem}
              onChange={(e) => setDraft((s) => (s ? { ...s, problem: e.target.value } : s))}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="md:col-span-2 block">
            <span className="text-sm font-medium text-foreground">Target customer</span>
            <textarea
              value={draft.target_customer}
              onChange={(e) => setDraft((s) => (s ? { ...s, target_customer: e.target.value } : s))}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Industry</span>
            <select
              value={draft.industry.industry ?? ""}
              onChange={(e) => {
                const industry = (e.target.value || null) as IndustryId | null;
                setDraft((s) => (s ? { ...s, industry: { industry, other: industry === "other" ? s.industry.other : "" } } : s));
              }}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select one</option>
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Industry (other)</span>
            <input
              value={draft.industry.other}
              onChange={(e) => setDraft((s) => (s ? { ...s, industry: { ...s.industry, other: e.target.value } } : s))}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="If industry is other"
            />
          </label>

          <label className="md:col-span-2 block">
            <span className="text-sm font-medium text-foreground">Competitors (comma or new line separated)</span>
            <textarea
              value={competitorsValue}
              onChange={(e) => setDraft((s) => (s ? { ...s, competitors: fromListValue(e.target.value) } : s))}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="md:col-span-2 block">
            <span className="text-sm font-medium text-foreground">Alternatives (comma or new line separated)</span>
            <textarea
              value={alternativesValue}
              onChange={(e) => setDraft((s) => (s ? { ...s, alternatives: fromListValue(e.target.value) } : s))}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <fieldset className="md:col-span-2">
            <legend className="text-sm font-medium text-foreground">Pricing models</legend>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRICING_OPTIONS.map((model) => {
                const selected = draft.pricing_model.pricingModels.includes(model);
                return (
                  <label key={model} className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        setDraft((s) => {
                          if (!s) return s;
                          const next = e.target.checked
                            ? [...s.pricing_model.pricingModels, model]
                            : s.pricing_model.pricingModels.filter((x) => x !== model);
                          return {
                            ...s,
                            pricing_model: {
                              ...s.pricing_model,
                              pricingModels: Array.from(new Set(next)),
                            },
                          };
                        });
                      }}
                    />
                    {model}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="md:col-span-2 block">
            <span className="text-sm font-medium text-foreground">Estimated price (optional)</span>
            <input
              value={draft.pricing_model.estimatedPrice ?? ""}
              onChange={(e) =>
                setDraft((s) =>
                  s
                    ? {
                        ...s,
                        pricing_model: {
                          ...s.pricing_model,
                          estimatedPrice: e.target.value || null,
                        },
                      }
                    : s
                )
              }
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="$29/month"
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={saving}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Continue"}
          </button>

          <Link href="/signup" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Edit answers manually
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import Image from "next/image";
import { SignupFormProvider } from './SignupFormContext'
import {
  IdeaStep,
  ProductTypeStep,
  FeaturesStep,
  ProblemStep,
  TargetCustomerStep,
  IndustryStep,
  CompetitorsStep,
  AlternativesStep,
  PricingModelStep,
  InterviewCountStep,
  InterviewUploadStep,
  StartupStageStep,
  type IndustryId,
  type PricingModelValue,
  type UploadedFile,
} from './Steps'
import { useRouter } from "next/navigation"

import { useSignupSession } from '@/lib/useSignupSession'
import { StepKey, getProgressPercent, getPrevStepKeyForContext } from '@/lib/signupSteps'
import { safeJson } from '@/lib/utils/parsing'
import type { ProductType } from '@/lib/types/answers'
import type { FinalAnswerSource } from '@/lib/types/answers'
import SpiralPreloader from '@/app/components/SpiralPreloader'

const PRELOADER_MIN_MS = 2250

function sleepPreloaderMin(startTime: number) {
  const elapsed = Date.now() - startTime
  const remaining = Math.max(0, PRELOADER_MIN_MS - elapsed)
  return remaining > 0 ? new Promise<void>((r) => setTimeout(r, remaining)) : Promise.resolve()
}

export default function SignupPage() {
  const { loading, error, currentStepKey, answersByStepKey, setAnswerLocal, submitAnswer, confirmAnswer, sessionId } = useSignupSession();
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urlPromptDismissed, setUrlPromptDismissed] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlSubmitting, setUrlSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const router = useRouter();
  const [finishing, setFinishing] = useState(false)

  const [overrideStepKey, setOverrideStepKey] = useState<StepKey | null>(null)

  if (loading) return <SpiralPreloader className="animate-fade-in" />;
  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-danger/40 bg-danger-soft p-5">
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      </div>
    );
  }
  const stepKey = (overrideStepKey ?? currentStepKey) as StepKey;
  const progressPercent = getProgressPercent(stepKey);
  const raw = answersByStepKey[stepKey] ?? "";
  const hasSavedAnswers = Object.values(answersByStepKey).some((value) => String(value ?? "").trim().length > 0);
  const shouldShowUrlPrompt =
    !urlPromptDismissed &&
    stepKey === "idea" &&
    !hasSavedAnswers &&
    !overrideStepKey;

  if (saving || finishing) return <SpiralPreloader className="animate-fade-in" />;

  async function startFromWebsiteUrl(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (urlSubmitting || !sessionId) return;

    const normalizedUrl = urlValue.trim();
    if (!normalizedUrl) {
      setUrlError("Enter a website URL first.");
      return;
    }

    setUrlSubmitting(true);
    setUrlError(null);
    try {
      const res = await fetch("/api/signup/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, url: normalizedUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to analyze this URL.");
      }
      router.push(`/signup/url/review?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Failed to analyze this URL.");
    } finally {
      setUrlSubmitting(false);
    }
  }

  if (shouldShowUrlPrompt) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-soft">
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-1.5">
            <Image src="/KroweIcon.png" alt="Krowe" width={16} height={16} className="rounded-sm" />
            <span className="text-[11px] font-semibold text-foreground">Krowe onboarding</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">What is your business website?</h1>
          <p className="mt-3 text-sm md:text-base text-muted-foreground">
            Add your URL and we will prefill onboarding so you can skip the manual questionnaire.
          </p>
          <form className="mt-6 space-y-4" onSubmit={startFromWebsiteUrl}>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Website URL</span>
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://yourcompany.com"
                className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </label>
            {urlError ? <p className="text-sm text-danger">{urlError}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={urlSubmitting || !sessionId}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {urlSubmitting ? "Analyzing..." : "Analyze My Business"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrlPromptDismissed(true);
                  setUrlError(null);
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Fill in manually instead
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function setLocal(step: StepKey, v: unknown) {
    const serialized = typeof v === 'string' ? v : JSON.stringify(v)
    setAnswerLocal(step, serialized)
  }

  async function finalizeSignup(sessionId: string) {
    const start = Date.now();
    setFinishing(true);
    try {
      const res = await fetch("/api/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "failed to compete signup");
      }

      router.replace(`/interviews`);
    } finally {
      await sleepPreloaderMin(start);
      setFinishing(false);
    }
  }

  async function confirmAndMaybeFinish(step: StepKey, finalAnswer: string, finalSource: FinalAnswerSource) {
    const result = await confirmAnswer(step, finalAnswer, finalSource);
    const nextStepKey = result?.nextStepKey ?? null;

    if (!nextStepKey) {
      if (!sessionId) throw new Error("Missing sessionId at finalize");
      await finalizeSignup(sessionId);
    }

    return result;
  }

  async function saveAndNext(step: StepKey, v: unknown) {
    if (saving || submitting) return;
    const start = Date.now();
    setSubmitting(true);

    try {
      const serialized = typeof v === "string" ? v : JSON.stringify(v);
      await submitAnswer(step, serialized);
      setSubmitting(false);
      setSaving(true);
      await confirmAndMaybeFinish(step, serialized, "original");
      setOverrideStepKey(null);
      await sleepPreloaderMin(start);
    } catch (error: unknown) {
      console.error("Error in saveAndNext:", error);
    } finally {
      setSubmitting(false);
      setSaving(false);
    }
  }

  // Context-aware back navigation (handles interview_count skip logic)

  function goBack() {
    const interviewCount = Number(answersByStepKey['interview_count'] ?? 0)
    const prev = getPrevStepKeyForContext(stepKey, { interviewCount })
    if (!prev) return
    setOverrideStepKey(prev)
  }

  // Skip an optional step by saving empty array and advancing
  async function skipStep(step: StepKey) {
    setSaving(true)
    try {
      await confirmAndMaybeFinish(step, '[]', 'original')
      setOverrideStepKey(null)
    } finally {
      setSaving(false)
    }
  }

  function wrap(ui: ReactNode) {
    return (
      <SignupFormProvider value={{ submitting }}>
        {ui}
      </SignupFormProvider>
    )
  }

  // ── Step renderers ────────────────────────────────────────────────────────

  if (stepKey === 'idea') {
    const ideaValue = raw || ''
    return wrap(
      <IdeaStep
        value={ideaValue}
        onChange={(v: string) => setLocal('idea', v)}
        onBack={goBack}
        onContinue={() => saveAndNext('idea', ideaValue)}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'product_type') {
    const productTypeValue = (raw || null) as ProductType
    return wrap(
      <ProductTypeStep
        value={productTypeValue}
        onChange={(v: ProductType) => setLocal('product_type', v ?? '')}
        onBack={goBack}
        onContinue={() => {
          if (!productTypeValue) return
          return saveAndNext('product_type', productTypeValue)
        }}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'features') {
    const featuresValue = safeJson<string[]>(raw) ?? []
    return wrap(
      <FeaturesStep
        value={featuresValue}
        onChange={(v: string[]) => setLocal('features', v)}
        onBack={goBack}
        onContinue={() => saveAndNext('features', featuresValue)}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'problem') {
    const problemValue = raw || ''
    return wrap(
      <ProblemStep
        value={problemValue}
        onChange={(v: string) => setLocal('problem', v)}
        onBack={goBack}
        onContinue={() => saveAndNext('problem', problemValue)}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'target_customer') {
    const targetCustomerValue = raw || ''
    return wrap(
      <TargetCustomerStep
        value={targetCustomerValue}
        onChange={(v: string) => setLocal('target_customer', v)}
        onBack={goBack}
        onContinue={() => saveAndNext('target_customer', targetCustomerValue)}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'industry') {
    const parsed = safeJson<{ industry: IndustryId | null; other: string }>(raw) ?? {
      industry: null,
      other: '',
    }
    const industryValue = parsed.industry
    const industryOtherValue = parsed.other ?? ''

    return wrap(
      <IndustryStep
        value={industryValue}
        otherValue={industryOtherValue}
        onChange={(v: IndustryId | null) => {
          const nextOther = v !== 'other' ? '' : industryOtherValue
          setLocal('industry', { industry: v, other: nextOther })
        }}
        onOtherChange={(t: string) => {
          setLocal('industry', { industry: industryValue, other: t })
        }}
        onBack={goBack}
        onContinue={() => {
          if (!industryValue) return
          return saveAndNext('industry', { industry: industryValue, other: industryOtherValue })
        }}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'competitors') {
    const competitorsValue = safeJson<string[]>(raw) ?? []
    return wrap(
      <CompetitorsStep
        value={competitorsValue}
        onChange={(v: string[]) => setLocal('competitors', v)}
        onBack={goBack}
        onContinue={() => saveAndNext('competitors', competitorsValue)}
        onSkip={() => skipStep('competitors')}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'alternatives') {
    const alternativesValue = safeJson<string[]>(raw) ?? []
    return wrap(
      <AlternativesStep
        value={alternativesValue}
        onChange={(v: string[]) => setLocal('alternatives', v)}
        onBack={goBack}
        onContinue={() => saveAndNext('alternatives', alternativesValue)}
        onSkip={() => skipStep('alternatives')}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'pricing_model') {
    const pricingValue = safeJson<PricingModelValue>(raw) ?? { pricingModels: [], estimatedPrice: null }
    return wrap(
      <PricingModelStep
        value={pricingValue}
        onChange={(v: PricingModelValue) => setLocal('pricing_model', v)}
        onBack={goBack}
        onContinue={() => saveAndNext('pricing_model', pricingValue)}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'interview_count') {
    const countValue = raw ? Number(raw) : 0
    return wrap(
      <InterviewCountStep
        value={countValue}
        onChange={(v: number) => setLocal('interview_count', String(v))}
        onBack={goBack}
        onContinue={async () => {
          await saveAndNext('interview_count', String(countValue))
          if (countValue === 0) {
            setOverrideStepKey('startup_stage')
          }
        }}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'interview_upload') {
    const uploadedFiles = safeJson<UploadedFile[]>(raw) ?? []
    return wrap(
      <InterviewUploadStep
        value={uploadedFiles}
        sessionId={sessionId}
        onBack={goBack}
        onContinue={async (files: UploadedFile[]) => {
          await saveAndNext('interview_upload', files)
        }}
        onSkip={() => skipStep('interview_upload')}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'startup_stage') {
    type StartupStage = 'idea' | 'validation' | 'pre-mvp' | 'mvp' | 'early-traction' | 'growth'
    const stageValue = (raw || null) as StartupStage | null
    return wrap(
      <StartupStageStep
        value={stageValue}
        onChange={(v: StartupStage) => setLocal('startup_stage', v)}
        onBack={goBack}
        onContinue={() => {
          if (!stageValue) return
          return saveAndNext('startup_stage', stageValue)
        }}
        progressPercent={progressPercent}
      />
    )
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 border rounded-lg bg-card">
        <p className="font-medium text-foreground">Unknown step: {String(stepKey)}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Check your StepKey list in <code>lib/signupSteps.ts</code>.
        </p>
      </div>
    </div>
  )
}

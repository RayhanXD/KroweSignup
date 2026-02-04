'use client'

import type React from "react"
import { useState } from 'react'
import FixNeededCard from './FixNeededCard'
import { SignupFixBannerProvider } from './SignupFixBannerContext'
import {
  AgeStep,
  IdeaStep,
  ProductTypeStep,
  ProblemStep,
  TargetCustomerStep,
  IndustryStep,
  IndustryExperienceStep,
  SkillsStep,
  TeamSizeStep,
  HoursCommitmentStep,
  type IndustryId,
} from './Steps'
import { useRouter } from "next/navigation"

import { useSignupSession } from '@/lib/useSignupSession'
import { StepKey, getProgressPercent, getPrevStepKey } from '@/lib/signupSteps'
import { STORAGE_KEYS, DEFAULT_VALUES } from '@/lib/constants'
import { safeJson } from '@/lib/utils/parsing'
import type { ProductType } from '@/lib/types/answers'
import type { FinalAnswerSource } from '@/lib/types/answers'
import next from "next"

const STORAGE_KEY = STORAGE_KEYS.SESSION_ID



export default function SignupPage() {
  const { loading, error, currentStepKey, answersByStepKey, setAnswerLocal, submitAnswer, confirmAnswer, sessionId } = useSignupSession();
  const [issues, setIssues] = useState<{ code: string; message: string; severity?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [canContinueAnyway, setCanContinueAnyway] = useState(false);
  const router = useRouter();
  const [finishing, setFinishing] = useState(false)

  //Slice 1: Optional client only back nav (NOT persisted if user refreshes)
  const [overrideStepKey, setOverrideStepKey] = useState<StepKey | null>(null)

  if (loading) return <div className='p-6'>Loading...</div>;
  if (error) return <div className='p-6 text-red-600'>{error}</div>
  const stepKey = (overrideStepKey ?? currentStepKey) as StepKey;
  const progressPercent = getProgressPercent(stepKey);
  const raw = answersByStepKey[stepKey] ?? "";
  const value = raw


  function setLocal(step: StepKey, v: unknown) {
    const serialized = typeof v === 'string' ? v : JSON.stringify(v)
    setAnswerLocal(step, serialized)
  }

  async function finalizeSignup(sessionId: string) {
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

      //this Clear resume token so /signup doesnt reopen a completed session
      localStorage.removeItem(STORAGE_KEY);

      //Redirect after the signup 
      router.replace(`/signup/complete?sessionId=${sessionId}`); //when final platform put dashboard here
    } finally {
      setFinishing(false);
    }
  }

  async function confirmAndMaybeFinish(step: StepKey, finalAnswer: string, finalSource: FinalAnswerSource) {
    const result = await confirmAnswer(step, finalAnswer, finalSource);

    // confirmAnswer MUST return { ok: true, nextStepKey: StepKey | null }
    const nextStepKey = result?.nextStepKey ?? null;

    if (!nextStepKey) {
      const sid = sessionId || localStorage.getItem(STORAGE_KEY);
      if (!sid) throw new Error("Missing sessionId at finalize");
      await finalizeSignup(sid);
    }

    return result;
  }



  async function saveAndNext(step: StepKey, v: unknown, force = false) {
    if (saving) return;
    setSaving(true);

    try {
      const serialized = typeof v === "string" ? v : JSON.stringify(v);
      //1) save + validate (+maybe ai suggestion) but dont advance
      const res = await submitAnswer(step, serialized, force);

      //always update UI state from resposne
      setIssues(res.issues || []);
      setCanContinueAnyway(Boolean(res.canContinueWithWarning));
      setAiSuggestion(res.aiSuggestion ?? null);
      setAiReason(res.aiReason ?? null);

      //2) if ok -> auto confirm (one click and advance)
      if (res.validationStatus === "ok") {
        await confirmAndMaybeFinish(step, serialized, "original");
        clearFixUI();
        setOverrideStepKey(null);
      }



      //ok -> clear issues and clear back overide
    } catch (error: any) {
      console.error("Error in saveAndNext:", error);
      setIssues([{ code: "ERROR", message: error?.message || "An error occurred. Please try again." }]);
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    const prev = getPrevStepKey(stepKey)
    if (!prev) return
    setOverrideStepKey(prev)
  }

  const continueAnyway = async () => {
    if (!canContinueAnyway) return // safety
    setSaving(true)
    try {
      // confirm the users current value and advance
      await confirmAndMaybeFinish(stepKey, value, 'original')
      clearFixUI()
      setOverrideStepKey(null)
    } finally {
      setSaving(false)
    }
  }

  const clearFixUI = () => {
    setIssues([]);
    setAiSuggestion(null);
    setAiReason(null);
    setCanContinueAnyway(false);
  }

  function renderWithIssues(ui: React.ReactNode) {
    const showFixCard = issues.length > 0 || aiSuggestion
    const fixBanner = showFixCard ? (
      <FixNeededCard
        issues={issues}
        aiSuggestion={aiSuggestion}
        aiReason={aiReason}
        canContinueAnyway={canContinueAnyway}
        saving={saving}
        finishing={finishing}
        onUseSuggestion={async () => {
          setSaving(true)
          try {
            await confirmAndMaybeFinish(stepKey, aiSuggestion!, 'ai_suggested')
            clearFixUI()
            setOverrideStepKey(null)
          } finally {
            setSaving(false)
          }
        }}
        onEditSuggestion={() => setLocal(stepKey, aiSuggestion!)}
        onSaveMyEdit={async () => {
          setSaving(true)
          try {
            await confirmAndMaybeFinish(stepKey, value, 'user_edited')
            clearFixUI()
            setOverrideStepKey(null)
          } finally {
            setSaving(false)
          }
        }}
        onContinueAnyway={continueAnyway}
      />
    ) : null
    return (
      <SignupFixBannerProvider value={fixBanner}>
        {ui}
      </SignupFixBannerProvider>
    )
  }


  async function sendToApi(message: string) {
    const res = await fetch('/api/signup/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`API error: ${res.status} - ${errorText}`)
    }

    const data = await res.json()
    return data
  }

  if (stepKey === 'age') {
    const ageValue = raw ? Number(raw) : DEFAULT_VALUES.AGE
    return renderWithIssues(
      <AgeStep
        value={ageValue}
        onChange={(v: number) => setLocal('age', String(v))}
        onBack={goBack}
        onContinue={() => saveAndNext('age', String(ageValue))}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'idea') {
    const ideaValue = raw || ''

    return renderWithIssues(
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
    return renderWithIssues(
      <ProductTypeStep
        value={productTypeValue}
        onChange={(v: ProductType) => setLocal('product_type', v ?? '')}
        onBack={goBack}
        onContinue={() => {
          // allow null selection to be blocked by UI (same as your old code)
          if (!productTypeValue) return
          return saveAndNext('product_type', productTypeValue)
        }}
        progressPercent={progressPercent}
      />
    )
  }
  if (stepKey === 'problem') {
    const problemValue = raw || ''


    return renderWithIssues(
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


    return renderWithIssues(
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
    // Stored as JSON: { industry: IndustryId|null, other: string }
    const parsed = safeJson<{ industry: IndustryId | null; other: string }>(raw) ?? {
      industry: null,
      other: '',
    }


    const industryValue = parsed.industry
    const industryOtherValue = parsed.other ?? ''

    return renderWithIssues(
      <IndustryStep
        value={industryValue}
        otherValue={industryOtherValue}
        onChange={(v: IndustryId | null) => {
          // mimic your old behavior: clear OTHER text when not "other"
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

  if (stepKey === 'industry_experience') {
    const industryExperienceValue = raw || ''


    return renderWithIssues(
      <IndustryExperienceStep
        value={industryExperienceValue}
        onChange={(v: string) => setLocal('industry_experience', v)}
        onBack={goBack}
        onContinue={() => saveAndNext('industry_experience', industryExperienceValue)}
        progressPercent={progressPercent}
      />
    )



  }

  if (stepKey === 'skills') {
    // Stored as JSON array: ["dev","marketing",...]
    const skillsValue = safeJson<Array<'dev' | 'marketing' | 'leadership' | 'other' | 'none'>>(raw) ?? []

    return renderWithIssues(
      <SkillsStep
        value={skillsValue}
        onChange={(v: Array<'dev' | 'marketing' | 'leadership' | 'other' | 'none'>) =>
          setLocal('skills', v)
        }
        onBack={goBack}
        onContinue={() => saveAndNext('skills', skillsValue)}
        progressPercent={progressPercent}
      />
    )
  }

  if (stepKey === 'team_size') {
    const teamSizeValue = raw ? Number(raw) : DEFAULT_VALUES.TEAM_SIZE


    return renderWithIssues(
      <TeamSizeStep
        value={teamSizeValue}
        onChange={(v: number) => setLocal('team_size', String(v))}
        onBack={goBack}
        onContinue={() => saveAndNext('team_size', String(teamSizeValue))}
        progressPercent={progressPercent}
      />
    )

  }

  if (stepKey === 'hours') {
    const hoursValue = raw ? Number(raw) : DEFAULT_VALUES.HOURS
    return renderWithIssues(
      <HoursCommitmentStep
        value={hoursValue}
        onChange={(v: number) => setLocal('hours', String(v))}
        onBack={goBack}
        onContinue={() => saveAndNext('hours', String(hoursValue))}
        progressPercent={progressPercent}
      />
    )
  }

  //fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 border rounded-lg bg-white">
        <p className="font-medium text-gray-800">Unknown step: {String(stepKey)}</p>
        <p className="text-sm text-gray-500 mt-2">
          Check your StepKey list in <code>lib/signupSteps.ts</code>.
        </p>
      </div>
    </div>
  )
}

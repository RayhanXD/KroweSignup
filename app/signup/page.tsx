'use client'

import type React from "react"
import { useState } from 'react'
import AgeStep from './Steps/AgeStep'
import IdeaStep from './Steps/IdeaStep'
import ProductTypeStep from './Steps/ProductTypeStep'
import ProblemStep from './Steps/ProblemStep'
import TargetCustomerStep from './Steps/TargetCustomerStep'
import IndustryStep, { IndustryId } from './Steps/IndustryStep'
import IndustryExperienceStep from './Steps/IndustryExperienceStep'
import SkillsStep from './Steps/SkillsStep'
import TeamSizeStep from './Steps/TeamSizeStep'
import HoursCommitmentStep from './Steps/HoursStep'

import { useSignupSession } from '@/lib/useSignupSession'
import {StepKey, getProgressPercent, getPrevStepKey} from '@/lib/signupSteps'

type ProductType = 'mobile' | 'web' | 'both' | 'other' | null

function safeJson<T = any>(s: string): T | null {
  try{
    return JSON.parse(s) as T
  } catch {
    return null
  }
}



export default function SignupPage() {
  const {loading, error, currentStepKey, answersByStepKey, setAnswerLocal, submitAnswer, confirmAnswer } = useSignupSession();
  const [issues, setIssues] = useState<{ code: string; message: string; severity?: string }[]>([]);
  const [canContinueAnyway, setCanContinueAnyway] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiReason, setAiReason] = useState<string | null>(null);

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

  async function saveAndNext(step: StepKey, v:unknown, force = false){
    if (saving) return;
    setSaving(true);

    try {
      const serialized = typeof v === "string" ? v: JSON.stringify(v);
      //1) save + validate (+maybe ai suggestion) but dont advance
      const res = await submitAnswer(step, serialized, false);

      //always update UI state from resposne

      
        setIssues(res.issues || []);
        setCanContinueAnyway(Boolean(res.canContinueWithWarning));
        setAiSuggestion(res.aiSuggestion ?? null);
        setAiReason(res.aiReason ?? null);

        //2) if ok -> auto confirm (one click and advance)
        if(res.validationStatus === "ok"){
          await confirmAnswer(step, serialized, "orginal");
          clearFixUI();
          setOverrideStepKey(null);
        }

        //3 if needs fix -> stop here, user must chose a confirm action
        //(use suggestion/ save edit /keept orgin anayawy)


      //ok -> clear issues and clear back overide
    } finally {
      setSaving(false);
    }
  }

  function goBack(){
    const prev = getPrevStepKey(stepKey)
    if (!prev) return
    setOverrideStepKey(prev)
  }

const continueAnyway = async () => {
  if(!canContinueAnyway) return; //saftey
  setSaving(true);
  try {
    //confirm the users current value and advance
    await confirmAnswer(stepKey, value, "orginal")
    clearFixUI();
    setOverrideStepKey(null);
  }finally {
    setSaving(false);
  }
}

const clearFixUI = () => {
  setIssues([]);
  setAiSuggestion(null);
  setAiReason(null);
  setCanContinueAnyway(false);
}

function renderWithIssues(ui: React.ReactNode) {
  return (
 <>
      {(issues.length > 0 || aiSuggestion) && (
        <div className="max-w-3xl mx-auto mb-6 p-4 rounded-xl border bg-white">
          {issues.length > 0 && (
            <>
              <div className="font-semibold mb-2 text-black">Fix needed</div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                {issues.map((i, idx) => (
                  <li key={idx}>{i.message}</li>
                ))}
              </ul>
            </>
          )}

          {/* AI suggestion box */}
          {aiSuggestion && (
            <div className="mt-4 p-3 rounded-lg border bg-gray-50">
              <div className="text-sm font-medium mb-1 text-black">Suggested rewrite</div>
              {aiReason && <div className="text-xs text-gray-500 mb-2">{aiReason}</div>}
              <div className="text-sm whitespace-pre-wrap text-black">{aiSuggestion}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                {/* CONFIRM AI suggestion and advance */}
                <button
                  disabled={saving}
                  className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await confirmAnswer(stepKey, aiSuggestion, "ai_suggested");
                      clearFixUI();
                      setOverrideStepKey(null);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Use suggestion
                </button>

                {/* Load suggestion into input so user can edit */}
                <button
                  disabled={saving}
                  className="px-3 py-2 rounded-lg border text-sm text-black"
                  onClick={() => setLocal(stepKey, aiSuggestion)}
                >
                  Edit suggestion
                </button>

                {/* CONFIRM user's edited value and advance */}
                <button
                  disabled={saving}
                  className="px-3 py-2 rounded-lg border text-sm text-black"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await confirmAnswer(stepKey, value, "user_edited");
                      clearFixUI();
                      setOverrideStepKey(null);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Save my edit
                </button>
              </div>
            </div>
          )}

          {/* Keep original anyway (only after fail twice) */}
          {canContinueAnyway && (
            <button
              onClick={continueAnyway}
              disabled={saving}
              className="mt-3 text-sm underline text-gray-600"
            >
              Keep my original anyway (results may be less accurate)
            </button>
          )}
        </div>
      )}

      {ui}
    </>
  );
}


  //render the current step

  if (stepKey === 'age'){
    const ageValue = raw? Number(raw) : 18
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

    return renderWithIssues (
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
    return renderWithIssues (
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


return renderWithIssues (
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

return renderWithIssues (
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


return renderWithIssues (
  <IndustryExperienceStep
    value={industryExperienceValue}
    onChange={(v: string) => setLocal('industry_experience', v)}
    onBack={goBack}
    onContinue={() => saveAndNext('industry_experience', industryExperienceValue)}
    progressPercent={progressPercent}
  />
)



}

  if (stepKey === 'skills'){
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
const teamSizeValue = raw ? Number(raw) : 1


return renderWithIssues (
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
const hoursValue = raw ? Number(raw) : 6
return renderWithIssues (
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

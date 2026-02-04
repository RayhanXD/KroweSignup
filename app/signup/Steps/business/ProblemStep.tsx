'use client'

import { Lock } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'

type ProblemStepProps = {
  value: string;
  onChange: (v: string) => void;
  onBack?: () => void;
  onContinue?: () => void;
  progressPercent?: number;
}

export default function ProblemStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 44,
}: ProblemStepProps) {
  const canContinue = value.trim().length >= 20

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#fef8f3] border border-orange-200/60 shadow-[0_0_0_1px_rgba(251,146,60,0.12)]">
              <span className="material-symbols-outlined text-orange-500">flag</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                What&apos;s the <br /> <span className="text-orange-500 bg-clip-text bg-gradient-to-r from-primary-600 to-primary-500">problem</span> your startup solves?
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Great startups are built on clear problem statements. Identify the specific pain point your target audience is facing.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200/60 space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary-500" /> Structure Tip
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Use this template: <br />
                <span className="text-gray-900 font-semibold">&quot;We help [target customer] [solve specific problem] by [simple solution/mechanism]&quot;</span>
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 pt-6 md:pt-8">
            <textarea
              id="problem"
              name="problem"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Ex: We help first-time founders turn ideas into launch-ready startups by guiding them step-by-step with AI"
              className="w-full h-64 p-4 text-black placeholder:text-muted-foreground bg-white border border-gray-200 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            />
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Auto-saved
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={!canContinue}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
                >
                  Continue
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Privacy Notice */}
        <footer className="px-6 pt-10 pb-4 w-full flex justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Your intellectual property is private and encrypted.</span>
          </div>
        </footer>
      </div>
    </SignupStepLayout>
  )
}

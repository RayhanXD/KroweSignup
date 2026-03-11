'use client'

import { ArrowRight } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

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
  const { submitting } = useSignupForm()

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="animate-fade-slide-in step-delay-1 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#fef8f3] border border-orange-200/60 shadow-[0_0_0_1px_rgba(251,146,60,0.12)]">
              <span className="material-symbols-outlined text-orange-500">flag</span>
            </div>
            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                What&apos;s the <br /> <span className="text-orange-500 bg-clip-text bg-gradient-to-r from-primary-600 to-primary-500">problem</span> your startup solves?
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                Great startups are built on clear problem statements. Identify the specific pain point your target audience is facing.
              </p>
            </div>
            {/* Structure Hint Box */}
            <div className="animate-fade-slide-in step-delay-4 bg-[#fafafa] rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Use this structure
                </span>
              </div>
              <p className="font-mono text-sm text-black leading-relaxed">
                &quot;We help <span className="text-[#f97316]">[target customer]</span>{' '}
                <span className="text-[#f97316]">[solve specific problem]</span> by{' '}
                <span className="text-[#f97316]">[simple solution/mechanism]</span>&quot;
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 pt-6 md:pt-8">
            <div className="animate-fade-slide-in step-delay-5">
            <textarea
              id="problem"
              name="problem"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Ex: We help first-time founders turn ideas into launch-ready startups by guiding them step-by-step with AI"
              className="w-full h-64 p-4 text-black placeholder:text-muted-foreground bg-white border border-gray-200 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            />
            </div>
            <div className="animate-fade-slide-in step-delay-6 flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Auto-saved
              </div>
              <div className="flex items-center gap-5">
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
                  disabled={!canContinue || submitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SignupStepLayout>
  )
}

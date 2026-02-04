'use client'

import { ArrowRight, Lightbulb, Lock } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'

type IdeaStepProps = {
  value: string;
  onChange: (v: string) => void;
  onBack?: () => void;
  onContinue?: () => void;
  progressPercent?: number; // optional (0-1)
}

export default function IdeaStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 22, // example 2/10 steps
}: IdeaStepProps) {
  const canContinue = value.trim().length > 20;

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#fff4e6] flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-[#f97316]" />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-black">
                Refine your
                <br />
                <span className="text-[#f97316]">Startup Vision</span>
              </h1>

              <p className="text-muted-foreground leading-relaxed">
                Clear articulation is the foundation of every successful venture. Focus on the core problem and your unique solution.
              </p>
            </div>

            {/* Structure Hint Box */}
            <div className="bg-[#fafafa] rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Use this structure 
                </span>
              </div>
              <p className="font-mono text-sm text-black leading-relaxed">
                &quot; <span className="text-[#f97316]">[Startup Name]</span> is a{' '}
                <span className="text-[#f97316]">[short description]</span> that solves{' '}
                <span className="text-[#f97316]">[problem]</span> by{' '}
                <span className="text-[#f97316]">[mechanism]</span> .&quot;
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Start typing your vision here..."
              className="w-full h-64 p-4 text-black placeholder:text-muted-foreground bg-white border border-gray-200 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] focus:shadow-md transition-colors"
            />

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Auto-saved</span>
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
                  className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <footer className="px-6 pt-10 pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Your intellectual property is private and encrypted.</span>
          </div>
        </footer>
      </div>
    </SignupStepLayout>
  )
}
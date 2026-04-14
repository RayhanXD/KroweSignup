'use client'

import { ArrowRight, Lightbulb } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

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
  const { submitting } = useSignupForm();

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="animate-fade-slide-in step-delay-1 w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>

            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Refine your
                <br />
                <span className="text-primary">Startup Vision</span>
              </h1>

              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                Clear articulation is the foundation of every successful venture. Focus on the core problem and your unique solution.
              </p>
            </div>

            {/* Structure Hint Box */}
            <div className="animate-fade-slide-in step-delay-4 bg-surface-subtle rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Use this structure 
                </span>
              </div>
              <p className="font-mono text-sm text-foreground leading-relaxed">
                &quot; <span className="text-primary">[Startup Name]</span> is a{' '}
                <span className="text-primary">[short description]</span> that solves{' '}
                <span className="text-primary">[problem]</span> by{' '}
                <span className="text-primary">[mechanism]</span> .&quot;
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="animate-fade-slide-in step-delay-5">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Start typing your vision here..."
              className="w-full h-64 p-4 text-foreground placeholder:text-muted-foreground bg-card border border-border rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:shadow-md transition-colors"
            />
            </div>

            {/* Footer Actions */}
            <div className="animate-fade-slide-in step-delay-6 flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span>Auto-saved</span>
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
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
'use client'

import { ArrowRight } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

type TeamSizeStepProps = {
  value: number
  onChange: (v: number) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

export default function TeamSizeStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 85
}: TeamSizeStepProps) {
  const teamSize = value
  const { submitting } = useSignupForm()

  const displayValue = teamSize === 30 ? '30+' : teamSize
  const displayText = teamSize === 30 ? 'person' : 'people'

  return (
    <>
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-5xl mx-auto relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-soft/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center p-6 md:p-12">
          <div className="lg:col-span-5 flex flex-col justify-center space-y-8 pt-4">
            <div className="space-y-4">
              <div className="animate-fade-slide-in step-delay-1 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-soft text-primary mb-2 border border-primary/20 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </div>
              <h1 className="animate-fade-slide-in step-delay-2 text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15]">
                How many people <br /> <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-primary-hover">are on your team?</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-base text-muted-foreground leading-relaxed max-w-md -mt-2">
                it&apos;s okay to not have anyone yet
              </p>
            </div>
            {/* Structure Hint Box */}
            <div className="animate-fade-slide-in step-delay-4 bg-surface-subtle rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Team Dynamics
                </span>
              </div>
              <p className="font-mono text-sm text-foreground leading-relaxed">
                Understanding your <span className="text-primary">team size</span> helps us recommend suitable <span className="text-primary">collaboration tools</span> and <span className="text-primary">mentorship programs</span> tailored to your scale.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7 w-full">
            <div className="animate-fade-slide-in step-delay-5 bg-card rounded-2xl shadow-[var(--shadow-soft)] ring-1 ring-border/60 overflow-hidden flex flex-col relative group transition-all duration-500 hover:shadow-lg hover:ring-border/80">
              <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 min-h-[260px]">
                <div className="w-full max-w-sm">
                  <div className="text-center mb-6">
                    <span className="block text-3xl md:text-4xl font-bold text-foreground mb-2" id="team-size-display">
                      {displayValue} {displayText}
                    </span>
                  </div>
                  <div className="relative w-full">
                    <input
                      type="range"
                      id="team-slider"
                      min="0"
                      max="30"
                      step="1"
                      value={teamSize}
                      onChange={(e) => onChange(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-muted/80 rounded-lg appearance-none cursor-pointer slider accent-primary"
                      style={{
                        background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(teamSize / 30) * 100}%, var(--track) ${(teamSize / 30) * 100}%, var(--track) 100%)`,
                      }}
                    />
                    <div className="flex justify-between mt-4 text-sm font-medium text-muted-foreground">
                      <span>0</span>
                      <span>30+</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 bg-card/80 backdrop-blur-sm border-t border-border/50 p-4 md:px-6 md:py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-success/80 animate-pulse" />
                  Auto-saved
                </div>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-muted-foreground hover:text-foreground text-sm font-medium px-2 py-2 transition-colors focus:outline-none"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={onContinue}
                    disabled={submitting}
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
      </div>
    </SignupStepLayout>
    <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid var(--track);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid var(--track);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </>
  )
}
